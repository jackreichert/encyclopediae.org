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
      
      // Verify Turnstile token
      const token = formData.get('token');
      const turnstileResponse = await verifyTurnstileToken(token, env.TURNSTILE_SECRET);
      if (!turnstileResponse.success) {
        return new Response('Invalid token', { status: 400 });
      }

      // Add input validation
      if (!formData.get('email')) {
        return new Response('Email is required', { status: 400 });
      }

      // Optional: validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.get('email'))) {
        return new Response('Invalid email format', { status: 400 });
      }

      // Prepare submission data
      const submission = {
        email: formData.get('email'),
        name: formData.get('name') || '',
        message: formData.get('message') || '',
        timestamp: new Date().toISOString()
      };

      // Save to Google Sheets
      await saveToGoogleSheets(submission, env);
      
      // Send notification email
      await sendNotificationEmail(submission, env);

      const response = new Response('Success', { 
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': 'https://encyclopediae.org',
        }
      });
      response.headers.set('Access-Control-Allow-Origin', 'https://encyclopediae.org');
      return response;

    } catch (error) {
      console.error('Submission error:', error);
      if (error.message.includes('Google')) {
        return new Response('Unable to save submission. Please try again later.', { status: 500 });
      }
      if (error.message.includes('email')) {
        return new Response('Email notification failed. Please try again later.', { status: 500 });
      }
      return new Response('Internal error', { status: 500 });
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