import { GoogleSpreadsheet } from 'google-spreadsheet';

export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://encyclopediae.org',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { 
        status: 405,
        headers: {
          'Access-Control-Allow-Origin': 'https://encyclopediae.org',
        }
      });
    }

    try {
      const formData = await request.formData();
      
      // Get form fields
      const email = formData.get('email');
      const name = formData.get('name') || '';
      const hasMessage = formData.get('has-message') === 'on';
      const message = hasMessage ? (formData.get('message') || '') : '';
      const token = formData.get('cf-turnstile-response');

      // Validate required fields
      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://encyclopediae.org',
          }
        });
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return new Response(JSON.stringify({ error: 'Invalid email format' }), { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://encyclopediae.org',
          }
        });
      }

      // Verify Turnstile token
      if (!token) {
        return new Response(JSON.stringify({ error: 'Please complete the verification challenge' }), { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://encyclopediae.org',
          }
        });
      }

      const turnstileResponse = await verifyTurnstileToken(token, env.TURNSTILE_SECRET);
      if (!turnstileResponse.success) {
        return new Response(JSON.stringify({ error: 'Invalid verification token' }), { 
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': 'https://encyclopediae.org',
          }
        });
      }

      // Prepare submission data
      const submission = {
        email,
        name,
        message,
        timestamp: new Date().toISOString()
      };

      // Save to Google Sheets
      await saveToGoogleSheets(submission, env);
      
      // Send notification email
      await sendNotificationEmail(submission, env);

      return new Response(JSON.stringify({ success: true }), { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://encyclopediae.org',
        }
      });

    } catch (error) {
      console.error('Submission error:', error);
      return new Response(JSON.stringify({ 
        error: 'An error occurred while processing your submission. Please try again.' 
      }), { 
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://encyclopediae.org',
        }
      });
    }
  }
};

async function verifyTurnstileToken(token, secret) {
  if (!token) {
    throw new Error('Missing Turnstile token');
  }

  const formData = new URLSearchParams();
  formData.append('secret', secret);
  formData.append('response', token);

  const response = await fetch(
    'https://challenges.cloudflare.com/turnstile/v0/siteverify',
    {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    }
  );

  const outcome = await response.json();
  
  if (!outcome.success) {
    console.error('Turnstile verification failed:', outcome);
    throw new Error('Invalid verification token');
  }

  return outcome;
}


async function saveToGoogleSheets(submission, env) {
  const doc = new GoogleSpreadsheet(env.GOOGLE_SHEET_ID);
  await doc.useServiceAccountAuth({
    client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: env.GOOGLE_PRIVATE_KEY,
  });
  
  await doc.loadInfo();
  const sheet = doc.sheetsByIndex[0];
  
  await sheet.addRow({
    Timestamp: submission.timestamp,
    Email: submission.email,
    Name: submission.name,
    Message: submission.message
  });
}


async function sendNotificationEmail(submission, env) {
  const email = {
    to: env.NOTIFICATION_EMAIL,
    from: `notifications@${env.SENDING_DOMAIN}`,
    subject: 'New Signup on Encyclopediae',
    text: `
      New signup received:
      Email: ${submission.email}
      Name: ${submission.name}
      Message: ${submission.message}
      Time: ${submission.timestamp}
    `
  };

  await env.EMAIL.send({
    to: email.to,
    from: email.from,
    subject: email.subject,
    text: email.text,
  });
} 