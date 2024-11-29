document.getElementById('signupForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const errorElement = document.getElementById('emailError');
    
    // Regular expression for academic email domains - expanded for international institutions
    const academicEmailRegex = /^[a-zA-Z0-9._%+-]+@(?:[a-zA-Z0-9-]+\.)*(?:edu|ac\.il|ac\.[a-z]{2}|edu\.[a-z]{2}|uni-[a-z]+\.[a-z]{2}|university\.[a-z]{2}|polytechnic\.[a-z]{2}|institute\.[a-z]{2}|hochschule\.[a-z]{2}|universite\.[a-z]{2}|universidad\.[a-z]{2}|universita\.[a-z]{2}|universiteit\.[a-z]{2}|universitet\.[a-z]{2})$/i;
    
    if (!academicEmailRegex.test(email)) {
        errorElement.textContent = 'Please use an academic email address (e.g. .edu, .ac.uk, .edu.au, uni-*.de, etc.)';
        return;
    }
    
    // Here you would typically send the email to your backend
    errorElement.textContent = '';
    alert('Thank you for signing up! We will notify you when we launch.');
    document.getElementById('email').value = '';
}); 