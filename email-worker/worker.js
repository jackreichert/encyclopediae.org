export default {
  async email(message, env, ctx) {
    // Log incoming email for debugging
    console.log('Received email:', {
      from: message.from,
      to: message.to,
      subject: message.subject,
    });

    // For now, just acknowledge receipt
    // You can add more processing logic here later if needed
    return {};
  },
};
