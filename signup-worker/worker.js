export default {
  async fetch(request, env) {
    // Updated CORS headers to allow both domains
    const corsHeaders = {
      "Access-Control-Allow-Origin": request.headers.get("Origin") || "https://encyclopediae.org",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Credentials": "true"
    };

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // For GET requests (testing/admin only)
    if (request.method === "GET") {
      try {
        const list = await env.SIGNUPS.list();
        
        // Fetch the actual data for each key
        const data = await Promise.all(
          list.keys.map(async (key) => {
            const value = await env.SIGNUPS.get(key.name);
            return {
              key: key.name,
              data: JSON.parse(value)
            };
          })
        );
        
        return new Response(JSON.stringify(data, null, 2), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json"
          }
        });
      }
    }

    // Your existing POST handling code...
    if (request.method === "POST") {
      try {
        const { email, firstName, lastName, institution, timestamp, token } = await request.json();

        // Basic validation
        if (!email || typeof email !== 'string') {
          return new Response("Invalid email", { status: 400 });
        }

        if (!token) {
          return new Response("Missing Turnstile token", { status: 400 });
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
          return new Response("Invalid Turnstile token", { status: 400 });
        }

        // Create a unique key using the email
        const key = `signup:${email}`;

        // Store the signup data with the new fields
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
            "Content-Type": "application/json",
          },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }
    }

    return new Response("Method not allowed", { 
      status: 405,
      headers: corsHeaders
    });
  },
}; 