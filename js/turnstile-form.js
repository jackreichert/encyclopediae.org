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

    widgetId = turnstile.render('#turnstile-wrapper', {
        sitekey: '0x4AAAAAAA1LWBtap2vUCeCA',
        theme: 'light',
        retry: 'never',
        refresh_expired: 'manual',
        callback: function (token) {
            console.log('Turnstile callback received');
            window.turnstileToken = token;
        },
        'expired-callback': function () {
            console.log('Token expired');
            window.turnstileToken = null;
        },
        'error-callback': function (error) {
            console.error('Turnstile error:', error);
            window.turnstileToken = null;
        },
    });
}

async function handleFormSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const button = form.querySelector('button');
    const errorElement = form.querySelector('.error-message') || createErrorElement(form);

    try {
        // Check if we have a valid token
        if (!window.turnstileToken) {
            throw new Error('Please complete the verification challenge');
        }

        button.classList.add('loading');
        errorElement.textContent = ''; // Clear any previous errors

        const formData = new FormData(form);
        formData.append('cf-turnstile-response', window.turnstileToken);

        const response = await fetch('https://encyclopediae.org/signup', {
            method: 'POST',
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Submission failed');
        }

        // Clear token after successful use
        window.turnstileToken = null;
        if (widgetId) {
            turnstile.reset(widgetId);
        }

        button.classList.remove('loading');
        button.classList.add('success');

        // Replace form with success message
        const successMessage = document.createElement('div');
        successMessage.className = 'success-message';
        successMessage.innerHTML = `
      <h3>Thank you for signing up!</h3>
      <p>We'll keep you updated about the Encyclopediae Initiative.</p>
    `;
        form.parentNode.replaceChild(successMessage, form);
    } catch (error) {
        console.error('Form submission error:', error);
        errorElement.textContent = error.message || 'An error occurred. Please try again.';
        button.classList.remove('loading');
        button.classList.add('error');

        // Reset Turnstile on error
        if (widgetId) {
            turnstile.reset(widgetId);
        }

        setTimeout(() => {
            button.classList.remove('error');
        }, 3000);
    }
}

function createErrorElement(form) {
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    form.insertBefore(errorElement, form.querySelector('button'));
    return errorElement;
}

// Handle message checkbox toggle
document.getElementById('has-message').addEventListener('change', function (e) {
    const messageGroup = document.querySelector('.message-group');
    const messageInput = document.getElementById('message');

    if (e.target.checked) {
        messageGroup.style.display = 'block';
        setTimeout(() => messageGroup.classList.add('visible'), 10);
    } else {
        messageGroup.classList.remove('visible');
        setTimeout(() => {
            messageGroup.style.display = 'none';
            messageInput.value = ''; // Clear the message when hidden
        }, 300);
    }
});

document.getElementById('signup-form').addEventListener('submit', handleFormSubmit);

// Initialize Turnstile when the script loads
window.onloadTurnstileCallback = function () {
    initTurnstile();
};
