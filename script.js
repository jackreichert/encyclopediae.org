document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const name = document.getElementById('name').value.trim();
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
    
    // Success case
    const form = document.getElementById('signupForm');
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <h3>Thank you for joining us!</h3>
        <p>We'll notify you when we launch.</p>
    `;
    form.parentNode.replaceChild(successMessage, form);
}); 