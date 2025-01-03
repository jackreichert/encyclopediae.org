import { GoogleSpreadsheet } from 'google-spreadsheet';

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

      // Google Sheets temporarily disabled
      // try {
      //   await saveToGoogleSheets(submission, env);
      // } catch (error) {
      //   console.error('Google Sheets error:', error);
      // }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Submission saved successfully',
        }),
        {
          status: 200,
          headers: corsHeaders,
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
          headers: corsHeaders,
        }
      );
    }
  },
};

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
  console.log('Turnstile verification response:', outcome);

  if (!outcome.success) {
    console.error('Turnstile verification failed:', {
      error_codes: outcome['error-codes'],
    });
    throw new Error(outcome['error-codes']?.join(', ') || 'Invalid verification token');
  }

  return outcome;
}

async function saveToGoogleSheets(submission, env) {
  const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_ID);

  // Auth with service account
  await doc.useServiceAccountAuth({
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY ? env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
  });

  // Load the sheet
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];

  // Add the row
  await sheet.addRow({
    Timestamp: submission.timestamp,
    Email: submission.email,
    Name: submission.name,
    Message: submission.message,
  });
}
