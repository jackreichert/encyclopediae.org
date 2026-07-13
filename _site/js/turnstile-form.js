/* global turnstile */

let widgetId = null;

function initTurnstile() {
  if (typeof turnstile === 'undefined') {
    console.error('Turnstile library is not available');
    return;
  }

  const wrapper = document.querySelector('#turnstile-wrapper');
  if (!wrapper) {
    console.error('Could not find #turnstile-wrapper');
    return;
  }

  if (widgetId !== null) {
    turnstile.remove(widgetId);
  }

  widgetId = turnstile.render('#turnstile-wrapper', {
    sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
    theme: 'light',
    retry: 'never',
    refresh_expired: 'manual',
    callback: function (token) {
      window.turnstileToken = token;
    },
    'expired-callback': function () {
      window.turnstileToken = null;
    },
    'error-callback': function (error) {
      console.error('Turnstile error:', error);
      window.turnstileToken = null;
    },
  });
}

function resetTurnstile() {
  window.turnstileToken = null;
  if (widgetId !== null && typeof turnstile !== 'undefined') {
    turnstile.reset(widgetId);
  }
}

async function parseJsonResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(text || `Request failed (${response.status})`);
  }

  try {
    return await response.json();
  } catch {
    throw new Error(`Request failed (${response.status})`);
  }
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('button[type="submit"], button');

  const existingErrorElement = form.querySelector('.error-message');
  if (existingErrorElement) {
    existingErrorElement.remove();
  }

  if (button) {
    button.disabled = true;
    button.classList.remove('error', 'success');
    button.classList.add('loading');
  }

  try {
    if (!window.turnstileToken) {
      throw new Error('Please complete the verification challenge');
    }

    const formData = new FormData(form);
    formData.append('cf-turnstile-response', window.turnstileToken);

    const response = await fetch('/api/signup', {
      method: 'POST',
      body: formData,
    });

    const result = await parseJsonResponse(response);

    if (!response.ok) {
      throw new Error(result.error || 'Submission failed');
    }

    resetTurnstile();

    if (button) {
      button.classList.remove('loading');
      button.classList.add('success');
    }

    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';

    const heading = document.createElement('h3');
    heading.textContent = 'Message received.';
    const body = document.createElement('p');
    body.textContent = 'Thank you for reaching out to the Encyclopediae Initiative.';
    successMessage.append(heading, body);

    form.parentNode.replaceChild(successMessage, form);
  } catch (error) {
    console.error('Form submission error:', error);
    const errorElement = form.querySelector('.error-message') || createErrorElement(form);
    errorElement.style.display = 'block';
    errorElement.textContent = error.message || 'An error occurred. Please try again.';

    if (button) {
      button.disabled = false;
      button.classList.remove('loading');
      button.classList.add('error');
      setTimeout(() => {
        button.classList.remove('error');
      }, 3000);
    }

    resetTurnstile();
  }
}

function createErrorElement(form) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.style.display = 'none';
  errorElement.setAttribute('role', 'alert');

  const button = form.querySelector('button[type="submit"], button');
  if (button) {
    form.insertBefore(errorElement, button);
  } else {
    form.appendChild(errorElement);
  }

  return errorElement;
}

function setupMessageToggle() {
  const checkbox = document.getElementById('has-message');
  const messageGroup = document.querySelector('.message-group');
  const messageInput = document.getElementById('message');

  if (!checkbox || !messageGroup || !messageInput) {
    return;
  }

  checkbox.addEventListener('change', function (e) {
    if (e.target.checked) {
      messageGroup.style.display = 'block';
      setTimeout(() => messageGroup.classList.add('visible'), 10);
    } else {
      messageGroup.classList.remove('visible');
      setTimeout(() => {
        messageGroup.style.display = 'none';
        messageInput.value = '';
      }, 300);
    }
  });
}

function initForm() {
  const form = document.getElementById('signup-form');
  if (!form) {
    return;
  }

  setupMessageToggle();
  form.addEventListener('submit', handleFormSubmit);
}

// Turnstile may finish loading before or after this script.
window.onloadTurnstileCallback = function () {
  initTurnstile();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initForm);
} else {
  initForm();
}

// If Turnstile already loaded (cached), initialize immediately.
if (typeof turnstile !== 'undefined') {
  initTurnstile();
}
