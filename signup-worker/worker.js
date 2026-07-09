export default {
  async fetch(request, env) {
    const allowedOrigins = ['https://encyclopediae.org', 'https://www.encyclopediae.org'];
    const origin = request.headers.get('Origin') || 'https://encyclopediae.org';
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', {
        status: 405,
        headers: corsHeaders,
      });
    }

    try {
      const formData = await request.formData();

      // Get form fields
      const email = formData.get('email');
      const name = formData.get('name') || '';
      const hasMessage = formData.get('has-message') === 'on';
      const message = hasMessage ? formData.get('message') || '' : '';
      const token = formData.get('cf-turnstile-response');

      // Validate required fields
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Verify Turnstile token
      if (!token) {
        return new Response(JSON.stringify({ error: 'Please complete the verification challenge' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      const turnstileResponse = await verifyTurnstileToken(token, env.TURNSTILE_SECRET_KEY);
      if (!turnstileResponse.success) {
        return new Response(JSON.stringify({ error: 'Invalid verification token' }), {
          status: 400,
          headers: corsHeaders,
        });
      }

      // Prepare submission data
      const submission = {
        email,
        name,
        message,
        timestamp: new Date().toISOString(),
      };

      // Save to KV first (more reliable)
      const submissionId = crypto.randomUUID();
      await env.SIGNUPS.put(submissionId, JSON.stringify(submission));

      const storageWarnings = [];

      // Write to Google Sheets when configured.
      if (canWriteToGoogleSheet(env)) {
        try {
          await appendSubmissionToGoogleSheet(env, submission);
        } catch (sheetError) {
          console.error('Google Sheets write failed after storing signup:', sheetError);
          storageWarnings.push('Signup stored, but Google Sheet write failed.');
        }
      } else {
        console.warn('Google Sheets env vars not configured; skipping sheet write.');
        storageWarnings.push('Signup stored, but Google Sheets is not configured in Worker environment.');
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Submission saved successfully',
          warnings: storageWarnings,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    } catch (error) {
      console.error('Submission error:', error);
      return new Response(
        JSON.stringify({
          error: 'An error occurred while processing your submission. Please try again.',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }
  },
};

function canWriteToGoogleSheet(env) {
  return Boolean(
    env.GOOGLE_SHEET_ID && env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );
}

function toBase64Url(input) {
  const bytes = input instanceof Uint8Array ? input : new TextEncoder().encode(input);
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function pemToArrayBuffer(pem) {
  const normalizedPem = normalizePrivateKey(pem);
  const base64 = normalizedPem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function normalizePrivateKey(rawValue) {
  let value = String(rawValue || '').trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith('\'') && value.endsWith('\''))
  ) {
    value = value.slice(1, -1);
  }

  // Support secrets provided with escaped newlines (\n) instead of real line breaks.
  value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r');

  return value;
}

async function getGoogleAccessToken(env) {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claimSet = {
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: nowSeconds + 3600,
    iat: nowSeconds,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedClaimSet = toBase64Url(JSON.stringify(claimSet));
  const unsignedJwt = `${encodedHeader}.${encodedClaimSet}`;

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', privateKey, new TextEncoder().encode(unsignedJwt));
  const signedJwt = `${unsignedJwt}.${toBase64Url(new Uint8Array(signature))}`;

  const tokenRequestBody = new URLSearchParams({
    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
    assertion: signedJwt,
  });

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: tokenRequestBody.toString(),
  });

  if (!tokenResponse.ok) {
    const tokenError = await tokenResponse.text();
    throw new Error(`Google token request failed: ${tokenResponse.status} ${tokenError}`);
  }

  const tokenJson = await tokenResponse.json();
  if (!tokenJson.access_token) {
    throw new Error('Google token response missing access_token');
  }

  return tokenJson.access_token;
}

async function appendSubmissionToGoogleSheet(env, submission) {
  const accessToken = await getGoogleAccessToken(env);
  const requestedRange = env.GOOGLE_SHEET_RANGE || 'A:D';
  const rowValues = [[submission.timestamp, submission.email, submission.name || '', submission.message || '']];

  const firstAttempt = await appendRow(accessToken, env.GOOGLE_SHEET_ID, requestedRange, rowValues);
  if (firstAttempt.ok) {
    return;
  }

  const firstAttemptError = await firstAttempt.text();
  const shouldFallbackToDefaultRange =
    requestedRange !== 'A:D' && firstAttempt.status === 400 && firstAttemptError.includes('Unable to parse range');

  if (shouldFallbackToDefaultRange) {
    console.warn(`Configured GOOGLE_SHEET_RANGE failed (${requestedRange}); retrying with default A:D.`);
    const fallbackAttempt = await appendRow(accessToken, env.GOOGLE_SHEET_ID, 'A:D', rowValues);
    if (fallbackAttempt.ok) {
      return;
    }

    const fallbackError = await fallbackAttempt.text();
    throw new Error(`Google Sheets append failed after fallback: ${fallbackAttempt.status} ${fallbackError}`);
  }

  throw new Error(`Google Sheets append failed: ${firstAttempt.status} ${firstAttemptError}`);
}

async function appendRow(accessToken, sheetId, valueRange, rowValues) {
  const encodedRange = encodeURIComponent(valueRange);
  return fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ values: rowValues }),
    }
  );
}

async function verifyTurnstileToken(token, secret) {
  let formData = new URLSearchParams();
  formData.append('secret', secret);
  formData.append('response', token);

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  const outcome = await result.json();
  console.warn('Turnstile verification response:', outcome);

  if (!outcome.success) {
    console.error('Turnstile verification failed:', {
      error_codes: outcome['error-codes'],
    });
    throw new Error(outcome['error-codes']?.join(', ') || 'Invalid verification token');
  }

  return outcome;
}

