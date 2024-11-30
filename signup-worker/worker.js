export default {
  async fetch(request, env) {
    // Allow both www and non-www versions
    const allowedOrigins = [
      'https://encyclopediae.org',
      'https://www.encyclopediae.org'
    ];

    const origin = request.headers.get('Origin');
    const corsHeaders = {
      'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'POST') {
      try {
        const { email, firstName, lastName, institution, timestamp, token } = await request.json();

        if (!email || typeof email !== 'string') {
          return new Response(JSON.stringify({ error: 'Invalid email' }), { 
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        if (!token) {
          return new Response(JSON.stringify({ error: 'Missing Turnstile token' }), { 
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Verify Turnstile token
        const formData = new FormData();
        formData.append('secret', env.TURNSTILE_SECRET_KEY);
        formData.append('response', token);
        formData.append('remoteip', request.headers.get('cf-connecting-ip'));

        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData
        });

        const outcome = await result.json();
        if (!outcome.success) {
          return new Response(JSON.stringify({ error: 'Invalid Turnstile token' }), { 
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Store the data
        const key = `signup:${email}`;
        await env.SIGNUPS.put(key, JSON.stringify({
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          institution: institution || '',
          timestamp
        }));

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    // Handle any other methods
    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });
  }
}; 