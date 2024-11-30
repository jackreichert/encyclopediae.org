/* global turnstile */

// Wait for DOM and Turnstile to be ready
document.addEventListener('DOMContentLoaded', function() {
  // Initialize Turnstile
  turnstile.render('#turnstile-widget', {
    sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
    theme: 'light',
    callback: function(token) {
      window.turnstileToken = token;
    },
    'error-callback': function() {
      const errorElement = document.getElementById('emailError');
      if (errorElement) {
        errorElement.textContent = 'Verification failed. Please try again.';
      }
    }
  });

  // Form submission handler
  const handleSubmit = async function(e) {
    e.preventDefault();
        
    const firstName = document.getElementById('firstName').value.trim();
    const lastName = document.getElementById('lastName').value.trim();
    const institution = document.getElementById('institution').value.trim();
    const email = document.getElementById('email').value.trim();
    const errorElement = document.getElementById('emailError');
        
    // Email validation
    if (!email) {
      errorElement.textContent = 'Please enter your email address';
      return;
    }
        
    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errorElement.textContent = 'Please enter a valid email address';
      return;
    }

    const token = window.turnstileToken;
    if (!token) {
      errorElement.textContent = 'Please complete the human verification';
      return;
    }
        
    try {
      const response = await fetch('https://signup.encyclopediae.workers.dev', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          institution,
          email,
          token,
          timestamp: new Date().toISOString()
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Submission failed');
      }

      // Success case
      const form = document.getElementById('signupForm');
      const successMessage = document.createElement('div');
      successMessage.className = 'success-message';
      successMessage.innerHTML = `
                    <h3>Thank you for joining us!</h3>
                    <p>We'll notify you when we launch.</p>
                `;
      form.parentNode.replaceChild(successMessage, form);

    } catch (error) {
      errorElement.textContent = error.message || 'There was a problem submitting your information. Please try again.';
      if (window.turnstileWidget) {
        turnstile.reset(window.turnstileWidget);
      }
    }
  };

  // Initialize form handler
  const form = document.getElementById('signupForm');
  if (form) {
    form.addEventListener('submit', handleSubmit);
  }
}); 