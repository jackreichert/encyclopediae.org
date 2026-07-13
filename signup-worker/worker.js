const MAX_EMAIL_LENGTH = 254;
const MAX_NAME_LENGTH = 200;
const MAX_MESSAGE_LENGTH = 5000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALLOWED_ORIGINS = ['https://encyclopediae.org', 'https://www.encyclopediae.org'];

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    }

    try {
      const formData = await request.formData();

      const email = String(formData.get('email') || '')
        .trim()
        .toLowerCase();
      const name = String(formData.get('name') || '').trim();
      const hasMessage = formData.get('has-message') === 'on';
      const message = hasMessage ? String(formData.get('message') || '').trim() : '';
      const token = formData.get('cf-turnstile-response');

      if (!email) {
        return jsonResponse({ error: 'Email is required' }, 400, corsHeaders);
      }

      if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
        return jsonResponse({ error: 'Invalid email format' }, 400, corsHeaders);
      }

      if (name.length > MAX_NAME_LENGTH) {
        return jsonResponse({ error: 'Name is too long' }, 400, corsHeaders);
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        return jsonResponse({ error: 'Message is too long' }, 400, corsHeaders);
      }

      if (!token) {
        return jsonResponse({ error: 'Please complete the verification challenge' }, 400, corsHeaders);
      }

      const turnstileResult = await verifyTurnstileToken(token, env.TURNSTILE_SECRET_KEY);
      if (!turnstileResult.success) {
        return jsonResponse({ error: 'Invalid verification token' }, 400, corsHeaders);
      }

      const submission = {
        email,
        name,
        message,
        timestamp: new Date().toISOString(),
      };

      // Persist to KV first (more reliable than Sheets alone).
      const submissionId = crypto.randomUUID();
      await env.SIGNUPS.put(submissionId, JSON.stringify(submission));

      const storageWarnings = [];

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

      return jsonResponse(
        {
          success: true,
          message: 'Submission saved successfully',
          warnings: storageWarnings,
        },
        200,
        corsHeaders
      );
    } catch (error) {
      console.error('Submission error:', error);
      return jsonResponse(
        {
          error: 'An error occurred while processing your submission. Please try again.',
        },
        500,
        corsHeaders
      );
    }
  },
};

function buildCorsHeaders(request) {
  const origin = request.headers.get('Origin') || ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

function jsonResponse(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
}

function canWriteToGoogleSheet(env) {
  return Boolean(env.GOOGLE_SHEET_ID && env.GOOGLE_SERVICE_ACCOUNT_EMAIL && env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
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
  const hasPkcs8Header = normalizedPem.includes('BEGIN PRIVATE KEY');
  const hasPkcs1Header = normalizedPem.includes('BEGIN RSA PRIVATE KEY');

  if (!hasPkcs8Header && !hasPkcs1Header) {
    throw new Error(
      'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must contain a PEM private key (or a JSON object with private_key).'
    );
  }

  let base64 = normalizedPem
    .replace(/-----BEGIN (?:RSA )?PRIVATE KEY-----/, '')
    .replace(/-----END (?:RSA )?PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');

  // Tolerate escaped or URL-safe variants that can appear in copied secrets.
  base64 = base64
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .replace(/[^A-Za-z0-9+/=]/g, '');

  // Ensure proper Base64 padding for atob().
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function normalizePrivateKey(rawValue) {
  let value = String(rawValue || '').trim();

  // Strip wrapping quotes from secrets that were copied with shell quoting.
  const first = value[0];
  const last = value[value.length - 1];
  if ((first === '"' || first === String.fromCharCode(39)) && first === last) {
    value = value.slice(1, -1);
  }

  // Support secrets stored as the entire service-account JSON blob.
  // Parse before newline unescaping to avoid invalidating JSON strings.
  let parsedKey = extractPrivateKeyFromJson(value);
  if (!parsedKey && value.includes('\\"')) {
    parsedKey = extractPrivateKeyFromJson(value.replace(/\\"/g, '"'));
  }
  if (parsedKey) {
    value = parsedKey;
  }

  // Support secrets provided with escaped newlines (\n) instead of real line breaks.
  value = value
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r');

  return value;
}

function extractPrivateKeyFromJson(input) {
  if (!input.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(input);
    if (parsed && typeof parsed.private_key === 'string') {
      return parsed.private_key;
    }
  } catch {
    return null;
  }

  return null;
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

/**
 * Verifies a Turnstile token. Returns { success } and never throws on a
 * failed challenge — callers map that to HTTP 400. Network/parse failures throw.
 */
async function verifyTurnstileToken(token, secret) {
  const formData = new URLSearchParams();
  formData.append('secret', secret);
  formData.append('response', token);

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: formData.toString(),
  });

  if (!result.ok) {
    throw new Error(`Turnstile siteverify HTTP ${result.status}`);
  }

  const outcome = await result.json();

  if (!outcome.success) {
    console.error('Turnstile verification failed:', {
      error_codes: outcome['error-codes'],
    });
  }

  return outcome;
}
