export default {
  async fetch(request, env) {
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

    const securityHeaders = {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
    };

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
              ...securityHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        if (!token) {
          return new Response(JSON.stringify({ error: 'Missing Turnstile token' }), { 
            status: 400,
            headers: {
              ...corsHeaders,
              ...securityHeaders,
              'Content-Type': 'application/json'
            }
          });
        }

        // Verify Turnstile token
        const formData = new URLSearchParams();
        formData.append('secret', env.TURNSTILE_SECRET_KEY);
        formData.append('response', token);
        formData.append('remoteip', request.headers.get('cf-connecting-ip'));

        const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          body: formData,
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
        });

        const outcome = await result.json();
        console.log('Turnstile verification result:', {
          success: outcome.success,
          errorCodes: outcome['error-codes'],
          hasSecret: !!env.TURNSTILE_SECRET_KEY,
          secretLength: env.TURNSTILE_SECRET_KEY?.length
        });

        if (!outcome.success) {
          // If it's a timeout/duplicate, send a specific message
          if (outcome['error-codes']?.includes('timeout-or-duplicate')) {
            return new Response(JSON.stringify({
              error: 'Verification expired. Please try again.',
              code: 'EXPIRED_TOKEN',
              details: outcome
            }), {
              status: 400,
              headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
            });
          }
          
          // Other errors
          return new Response(JSON.stringify({
            error: 'Invalid Turnstile token',
            details: outcome,
            hasSecret: !!env.TURNSTILE_SECRET_KEY,
            secretLength: env.TURNSTILE_SECRET_KEY?.length
          }), {
            status: 400,
            headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Store in KV using the binding
        try {
          const signupKey = `signup:${email}`;
          const signupData = {
            email,
            firstName: firstName || '',
            lastName: lastName || '',
            institution: institution || '',
            timestamp
          };
          
          // Use the KV binding directly
          await env.SIGNUPS.put(signupKey, JSON.stringify(signupData));
          
          return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
          });
        } catch (kvError) {
          console.error('KV Error:', kvError, env.SIGNUPS);
          return new Response(JSON.stringify({ 
            error: 'Failed to store signup',
            details: kvError.message,
            hasKV: !!env.SIGNUPS
          }), {
            status: 500,
            headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
          });
        }

      } catch (error) {
        console.error('Worker error:', error);
        return new Response(JSON.stringify({ 
          error: 'Internal server error',
          details: error.message 
        }), {
          status: 500,
          headers: { ...corsHeaders, ...securityHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: {
        ...corsHeaders,
        ...securityHeaders
      }
    });
  }
}; 