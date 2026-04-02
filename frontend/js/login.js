// Check if already logged in - redirect if so
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        window.location.href = '/extract';
    }
});

// API Base URL - change this if deploying to production
const API_URL = '';

// Function 1: Request verification code
function requestCode() {
    const email = document.getElementById('email').value;
    
    // Validate email
    if (!email) {
        showMessage('Please enter your email', true);
        return;
    }
    
    // Call backend
    fetch(`${API_URL}/api/auth/request-code`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showMessage('Verification code sent to your email!', false);
            // Show code form
            document.getElementById('emailForm').classList.add('hidden');
            document.getElementById('codeForm').classList.remove('hidden');
        } else {
            showMessage(data.detail || 'Failed to send code', true);
        }
    })
    .catch(error => {
        showMessage('Network error. Make sure backend is running.', true);
    });
}

// Function 2: Verify code and login
function verifyCode() {
    const email = document.getElementById('email').value;
    const code = document.getElementById('code').value;
    
    // Validate
    if (!code || code.length !== 6) {
        showMessage('Please enter the 6-digit code', true);
        return;
    }
    
    // Call backend
    fetch(`${API_URL}/api/auth/submit-code`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
            email: email, 
            otp: code 
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.token) {
            // Save token to browser storage
            localStorage.setItem('auth_token', data.token);
            showMessage('Login successful! Redirecting...', false);
            // Redirect to extract page
            setTimeout(() => {
                window.location.href = '/extract';
            }, 1000);
        } else {
            showMessage(data.detail || 'Invalid code', true);
        }
    })
    .catch(error => {
        showMessage('Verification failed. Please try again.', true);
    });
}

// Function 3: Back to email input
function backToEmail() {
    document.getElementById('emailForm').classList.remove('hidden');
    document.getElementById('codeForm').classList.add('hidden');
    document.getElementById('code').value = '';
}

// Helper: Show message to user
function showMessage(text, isError) {
    const msgDiv = document.getElementById('message');
    msgDiv.textContent = text;
    msgDiv.className = isError 
        ? 'mt-4 p-4 rounded-lg bg-red-100 text-red-700'
        : 'mt-4 p-4 rounded-lg bg-green-100 text-green-700';
    msgDiv.classList.remove('hidden');
}