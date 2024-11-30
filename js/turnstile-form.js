/* global turnstile */

let widgetId = null;

// Wait for DOM and Turnstile to be ready
function initTurnstile() {
  if (typeof turnstile === 'undefined') {
    console.log('Waiting for Turnstile to load...');
    setTimeout(initTurnstile, 100);
    return;
  }

  console.log('Initializing Turnstile widget...');
  widgetId = turnstile.render('#turnstile-widget', {
    sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
    theme: 'light',
    retry: 'never',
    callback: function (token) {
      console.log('Turnstile callback received');
      window.turnstileToken = token;
    },
    'error-callback': function (error) {
      console.error('Turnstile error:', error);
      if (widgetId) {
        turnstile.reset(widgetId);
      }
      const errorElement = document.getElementById('emailError');
      if (errorElement) {
        errorElement.textContent = 'Verification failed. Please try again.';
      }
    }
  });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initTurnstile);

// Form submission
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const errorElement = document.getElementById('emailError');
  const token = window.turnstileToken;

  // Clear any previous error
  errorElement.textContent = '';

  if (!token) {
    errorElement.textContent = 'Please complete the human verification';
    if (widgetId) {
      turnstile.reset(widgetId);
    }
    return;
  }

  try {
    const response = await fetch('https://signup.encyclopediae.workers.dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        institution: document.getElementById('institution').value.trim(),
        email: document.getElementById('email').value.trim(),
        token,
        timestamp: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      // If it's a Turnstile error, reset the widget
      if (errorData.details?.['error-codes']?.includes('timeout-or-duplicate')) {
        turnstile.reset(); // Reset the widget
        errorElement.textContent = 'Verification expired. Please verify again.';
        return;
      }
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
    turnstile.reset(); // Always reset on error
  }
}); 