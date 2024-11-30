export default {
  async fetch(request, env) {
    // Test endpoint for verifying secrets (remove after testing)
    if (request.method === "GET") {
      try {
        // Check if secrets exist (without revealing their values)
        const secretsStatus = {
          kv_namespace: !!env.KV_NAMESPACE_ID,
          turnstile: !!env.TURNSTILE_SECRET_KEY
        };
        
        return new Response(JSON.stringify(secretsStatus, null, 2), {
          headers: {
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

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
        // Rate limiting
        const ip = request.headers.get('cf-connecting-ip');
        const rateLimitKey = `rate_limit:${ip}`;
        const existing = await env.SIGNUPS.get(rateLimitKey);

        if (existing) {
          return new Response(JSON.stringify({ error: 'Please wait before submitting again' }), {
            status: 429,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

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

        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: formData
        });

        const outcome = await result.json();
        console.log('Turnstile verification result:', outcome);

        if (!outcome.success) {
          return new Response(JSON.stringify({ 
            error: 'Invalid Turnstile token',
            details: outcome 
          }), { 
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Store the signup data
        const signupKey = `signup:${email}`;
        await env.SIGNUPS.put(signupKey, JSON.stringify({
          email,
          firstName: firstName || '',
          lastName: lastName || '',
          institution: institution || '',
          timestamp
        }));

        // Set rate limit
        await env.SIGNUPS.put(rateLimitKey, '1', { expirationTtl: 60 }); // 1 minute cooldown

        const securityHeaders = {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
          'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
        };

        return new Response(JSON.stringify({ success: true }), {
          headers: {
            ...corsHeaders,
            ...securityHeaders,
            'Content-Type': 'application/json'
          }
        });

      } catch (error) {
        console.error('Worker error:', error);
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