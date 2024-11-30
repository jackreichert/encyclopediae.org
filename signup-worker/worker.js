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
      const { email, name, institution, timestamp } = await request.json();

      // Basic validation
      if (!email || typeof email !== 'string') {
        return new Response("Invalid email", { status: 400 });
      }

      // Create a unique key using the email
      const key = `signup:${email}`;

      // Store the signup data
      await env.SIGNUPS.put(key, JSON.stringify({
        email,
        name: name || '',
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