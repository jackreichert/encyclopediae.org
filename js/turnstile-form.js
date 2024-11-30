/* global turnstile */

let widgetId = null;

// Initialize Turnstile widget
function initTurnstile() {
  console.log('Initializing Turnstile widget...');
  if (widgetId) {
    turnstile.remove(widgetId);
  }

  widgetId = turnstile.render('#turnstile-widget', {
    sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
    theme: 'light',
    retry: 'auto',
    refresh_expired: 'auto',
    timeout: 5,  // 5 second timeout
    callback: function (token) {
      console.log('Turnstile callback received');
      window.turnstileToken = token;
    },
    'expired-callback': function () {
      console.log('Token expired, refreshing...');
      window.turnstileToken = null;
      turnstile.reset(widgetId);
    },
    'error-callback': function (error) {
      console.error('Turnstile error:', error);
      window.turnstileToken = null;
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

// Form submission handler
document.getElementById('signupForm').addEventListener('submit', async function (e) {
  e.preventDefault();
    
  // Reset the widget before submission to ensure fresh token
  if (widgetId) {
    turnstile.reset(widgetId);
  }
    
  // Wait briefly for new token
  await new Promise(resolve => setTimeout(resolve, 1000));
    
  const token = window.turnstileToken;
  const errorElement = document.getElementById('emailError');
    
  if (!token) {
    errorElement.textContent = 'Please complete the verification again';
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

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTurnstile);
} else {
  initTurnstile();
} 