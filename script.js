document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const errorElement = document.getElementById('emailError');
    
    // Regular expression for academic email domains
    const academicEmailRegex = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)*(?:edu|ac\.uk|edu\.au|ac\.nz|edu\.cn|ac\.jp|edu\.sg|ac\.za|edu\.br|ac\.in)$/i;
    
    if (!academicEmailRegex.test(email)) {
        errorElement.textContent = 'Please use an academic email address (.edu, .ac.uk, etc.)';
        return;
    }
    
    // Here you would typically send the email to your backend
    errorElement.textContent = '';
    alert('Thank you for signing up! We will notify you when we launch.');
    document.getElementById('email').value = '';
}); 