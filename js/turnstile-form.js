/* global turnstile */

// Turnstile initialization
document.addEventListener('DOMContentLoaded', function () {
  // Wait a short moment to ensure Turnstile is fully loaded
  setTimeout(() => {
    if (typeof turnstile !== 'undefined') {
      turnstile.ready(function () {
        turnstile.render('#turnstile-widget', {
          sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
          theme: 'light',
          retry: 'auto',
          refresh_expired: 'auto',
          callback: function (token) {
            window.turnstileToken = token;
          },
          'error-callback': function () {
            const errorElement = document.getElementById('emailError');
            if (errorElement) {
              errorElement.textContent = 'Verification failed. Please try again.';
            }
          }
        });
      });
    } else {
      console.error('Turnstile failed to load');
    }
  }, 1000);
});

// Form submission
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const errorElement = document.getElementById('emailError');
  const token = window.turnstileToken;

  // Clear any previous error
  errorElement.textContent = '';

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

window.onloadTurnstileCallback = function () {
  turnstile.render('#turnstile-widget', {
    sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
    theme: 'light',
    retry: 'auto',
    refresh_expired: 'auto',
    callback: function (token) {
      window.turnstileToken = token;
    },
    'error-callback': function () {
      const errorElement = document.getElementById('emailError');
      if (errorElement) {
        errorElement.textContent = 'Verification failed. Please try again.';
      }
    }
  });
}; 