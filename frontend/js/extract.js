// Check if user is logged in on page load
window.addEventListener('DOMContentLoaded', () => {
	checkAuth(); // Now from utils.js
});

function startProgressMessages() {
	const messages = [
		{ text: "Downloading video...", delay: 0 },
		{ text: "Extracting audio...", delay: 8000 },
		{ text: "Transcribing speech...", delay: 18000 },
		{ text: "Analyzing recipe with AI...", delay: 30000 },
		{ text: "Almost done...", delay: 50000 },
	];

	messages.forEach(({ text, delay }) => {
		setTimeout(() => {
			const msg = document.getElementById('loadingMessage');
			if (msg) msg.textContent = text;
		}, delay);
	});
}

// Function: Extract recipe from video URL
function extractRecipe() {
	const url = document.getElementById('videoUrl').value;
	const instructions = document.getElementById('instructions').value;

	// Validate URL
	if (!url) {
		showMessage('Please enter a video URL', true);
		return;
	}

	// Get token
	const token = localStorage.getItem('auth_token');

	// Show loading state
	document.getElementById('extractBtn').disabled = true;
	document.getElementById('loading').classList.remove('hidden');
	startProgressMessages();
	document.getElementById('recipeDisplay').classList.add('hidden');

	// Call backend
	fetch(`${API_URL}/api/extract`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Authorization': `Bearer ${token}`
		},
		body: JSON.stringify({
			url: url,
			instructions: instructions
		})
	})
		.then(response => {
			if (response.status === 401) {
				localStorage.removeItem('auth_token');
				window.location.href = '/login';
				return;
			}
			return response.json();
		})
		.then(data => {
			document.getElementById('loading').classList.add('hidden');
			document.getElementById('extractBtn').disabled = false;

		if (data && data.status === 'success') {
			showMessage('Recipe extracted! Redirecting...', false);
			setTimeout(() => {
				window.location.href = `/recipe?id=${data.recipe_id}`;
			}, 1500);
		} else if (data) {
			showMessage(data.detail || 'Failed to extract recipe', true);
		}
		})
		.catch(error => {
			document.getElementById('loading').classList.add('hidden');
			document.getElementById('extractBtn').disabled = false;
			showMessage('Error extracting recipe. Please try again.', true);
		});
}
