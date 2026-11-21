const API_URL = '';

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
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: email, turnstile_token: turnstileToken })
	})
		.then(response => response.json())
		.then(data => {
			if (data.message) {
				showMessage('Verification code sent! Check your inbox or spam folder if you don\'t see it.', false);
				document.getElementById('emailForm').classList.add('hidden');
				document.getElementById('codeForm').classList.remove('hidden');
			} else {
				turnstile.reset();
				showMessage(data.detail || 'Failed to send code', true);
			}
		})
		.catch(() => {
			turnstile.reset();
			showMessage('Network error. Please try again.', true);
		});
}

function verifyCode() {
	const email = document.getElementById('email').value;
	const code = document.getElementById('code').value;

	if (!code || code.length !== 6) {
		showMessage('Please enter the 6-digit code', true);
		return;
	}

	fetch(`${API_URL}/api/auth/submit-code`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email: email, otp: code })
	})
		.then(response => response.json())
		.then(data => {
			if (data.token) {
				localStorage.setItem('auth_token', data.token);
				document.cookie = `auth_token=${data.token}; path=/; max-age=2592000; SameSite=Lax`;
				showMessage('Login successful! Redirecting...', false);
				setTimeout(() => {
					window.location.href = '/home';
				}, 1000);
			} else {
				showMessage(data.detail || 'Invalid code', true);
			}
		})
		.catch(() => {
			showMessage('Verification failed. Please try again.', true);
		});
}

function backToEmail() {
	document.getElementById('emailForm').classList.remove('hidden');
	document.getElementById('codeForm').classList.add('hidden');
	document.getElementById('code').value = '';
}

function showMessage(text, isError) {
	const msgDiv = document.getElementById('message');
	msgDiv.textContent = text;
	msgDiv.className = isError
		? 'mt-4 p-4 rounded-lg bg-red-100 text-red-700'
		: 'mt-4 p-4 rounded-lg bg-green-100 text-green-700';
	msgDiv.classList.remove('hidden');
}

function loadFeed() {
	fetch('/api/feed')
		.then(r => r.json())
		.then(data => {
			if (!data.recipes) return;
			const container = document.getElementById('feedContainer');
			data.recipes.forEach(recipe => {
				const card = document.createElement('a');
				card.href = `/r/${recipe.id}`;
				card.className = 'block bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden';
				card.innerHTML = `
					<div class="p-6">
						<h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-2">${recipe.title || 'Untitled'}</h3>
						<p class="text-xs text-pink-dark">by @${recipe.owner_username}</p>
						<p class="text-xs text-gray-500 mt-1">${recipe.prep_time ? recipe.prep_time + ' min' : ''}</p>
					</div>
					<div class="bg-pink-light px-6 py-3 text-pink-dark font-semibold text-sm">
						View Recipe →
					</div>
				`;
				container.appendChild(card);
			});
		})
		.catch(() => {});
}

window.addEventListener('DOMContentLoaded', () => {
	let token = localStorage.getItem('auth_token');
	if (!token) {
		const match = document.cookie.match(/auth_token=([^;]+)/);
		token = match ? match[1] : null;
		if (token) localStorage.setItem('auth_token', token);
	}
	if (token) {
		window.location.href = '/home';
	}
	loadFeed();
});