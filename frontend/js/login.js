// API Base URL - change this if deploying to production
const API_URL = '';

// Function 1: Request verification code
function requestCode() {
    const email = document.getElementById('email').value;
    const turnstileInput = document.querySelector('[name="cf-turnstile-response"]');
	const turnstileToken = turnstileInput ? turnstileInput.value : null;

    if (!email) {
        showMessage('Please enter your email', true);
        return;
    }

    if (!turnstileToken) {
        showMessage('Please complete the CAPTCHA', true);
        return;
    }

    fetch(`${API_URL}/api/auth/request-code`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: email, turnstile_token: turnstileToken })
    })
    .then(response => response.json())
    .then(data => {
        if (data.message) {
            showMessage('Verification code sent to your email!', false);
            document.getElementById('emailForm').classList.add('hidden');
            document.getElementById('codeForm').classList.remove('hidden');
        } else {
            turnstile.reset();
            showMessage(data.detail || 'Failed to send code', true);
        }
    })
    .catch(error => {
        turnstile.reset();
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

function loadFeed() {
    fetch('/api/feed?limit=3')
        .then(r => r.json())
        .then(data => {
            if (!data.recipes) return;
            const container = document.getElementById('feedContainer');
            data.recipes.forEach(recipe => {
                const card = document.createElement('a');
                card.href = `/r/${recipe.id}`;
                card.className = 'flex-shrink-0 w-56 bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden cursor-pointer';
                card.innerHTML = `
                    <div class="p-4">
                        <h3 class="font-bold text-gray-800 text-sm line-clamp-2 mb-2">${recipe.title || 'Untitled'}</h3>
                        <p class="text-xs text-pink-dark">by @${recipe.owner_username}</p>
                        <p class="text-xs text-gray-400 mt-1">${recipe.prep_time ? recipe.prep_time + ' min' : ''}</p>
                    </div>
                    <div class="bg-pink-light px-4 py-2 text-pink-dark text-xs font-semibold">View Recipe →</div>
                `;
                container.appendChild(card);
            });
        })
        .catch(() => {});
}

window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        window.location.href = '/extract';
    }
    loadFeed();
});