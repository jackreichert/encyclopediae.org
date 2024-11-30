/* global turnstile */

let widgetId = null;

function countWords(str) {
  return str.trim().split(/\s+/).length;
}

// Initialize Turnstile widget
function initTurnstile() {
  console.log('Initializing Turnstile widget...');
  if (widgetId) {
    turnstile.remove(widgetId);
  }

  widgetId = turnstile.render('#turnstile-widget', {
    sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
    theme: 'light',
    retry: 'never',
    refresh_expired: 'manual',
    appearance: 'always',
    callback: function (token) {
      console.log('Turnstile callback received');
      window.turnstileToken = token;
    },
    'expired-callback': function() {
      console.log('Token expired');
      window.turnstileToken = null;
      const errorElement = document.getElementById('emailError');
      if (errorElement) {
        errorElement.textContent = 'Verification expired. Please refresh and try again.';
      }
    },
    'error-callback': function(error) {
      console.error('Turnstile error:', error);
      window.turnstileToken = null;
      const errorElement = document.getElementById('emailError');
      if (errorElement) {
        errorElement.textContent = 'Verification failed. Please try again.';
      }
    }
  });
}

// Form submission handler
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  
  const errorElement = document.getElementById('emailError');
  errorElement.textContent = ''; // Clear previous errors
  
  // Validate token first
  if (!window.turnstileToken) {
    errorElement.textContent = 'Please complete the verification challenge';
    return;
  }

  const message = document.getElementById('message').value.trim();

  // Validate message length
  if (message.length > 1500) {
    errorElement.textContent = 'Message must be less than 1500 characters';
    return;
  }

  // Validate word count
  if (countWords(message) > 250) {
    errorElement.textContent = 'Message must be less than 250 words';
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
        message: message,
        token: window.turnstileToken,
        timestamp: new Date().toISOString()
      })
    });

    // Clear token after use to prevent reuse
    const usedToken = window.turnstileToken;
    window.turnstileToken = null;
    
    if (!response.ok) {
      const errorData = await response.json();
      if (errorData.details?.['error-codes']?.includes('timeout-or-duplicate')) {
        if (widgetId) {
          turnstile.reset(widgetId);
        }
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
      <h3>Thank you for your message!</h3>
      <p>We'll be in touch soon.</p>
    `;
    form.parentNode.replaceChild(successMessage, form);

  } catch (error) {
    console.error('Submission error:', error);
    errorElement.textContent = error.message || 'There was a problem submitting your information. Please try again.';
    if (widgetId) {
      turnstile.reset(widgetId);
    }
  }
});

// Remove the direct initTurnstile() call and replace with:
window.onloadTurnstileCallback = function () {
  initTurnstile();
}; 