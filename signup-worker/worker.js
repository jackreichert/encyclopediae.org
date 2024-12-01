import { GoogleSpreadsheet } from 'google-spreadsheet';

export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const formData = await request.formData();
      
      // Verify Turnstile token
      const token = formData.get('token');
      const turnstileResponse = await verifyTurnstileToken(token, env.TURNSTILE_SECRET);
      if (!turnstileResponse.success) {
        return new Response('Invalid token', { status: 400 });
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

      return new Response('Success', { status: 200 });

    } catch (error) {
      console.error('Submission error:', error);
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
    from: 'noreply@yourdomain.com',
    subject: 'New Signup on Academic Search',
    text: `
      New signup received:
      Email: ${submission.email}
      Name: ${submission.name}
      Message: ${submission.message}
      Time: ${submission.timestamp}
    `
  };

  await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ personalizations: [{ to: [{ email: email.to }] }], 
      from: { email: email.from },
      subject: email.subject,
      content: [{ type: 'text/plain', value: email.text }] })
  });
} 