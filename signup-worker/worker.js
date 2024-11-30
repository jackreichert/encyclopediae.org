export default {
  async fetch(request, env) {
    // Handle CORS preflight requests
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    // Only allow POST requests
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

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

      // Store the signup data
      await env.SIGNUPS.put(key, JSON.stringify({
        email,
        firstName: firstName || '',
        lastName: lastName || '',
        institution: institution || '',
        timestamp
      }));

      return new Response(JSON.stringify({ success: true }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: "Internal server error" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  },
}; 