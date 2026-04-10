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
				displayRecipe(data.recipe);
				showMessage('Recipe extracted successfully!', false);
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

// Function: Display extracted recipe
function displayRecipe(recipe) {
	document.getElementById('recipeDisplay').classList.remove('hidden');

	// Title
	document.getElementById('recipeTitle').textContent = recipe.title || 'Untitled Recipe';

	// Times and servings
	document.getElementById('prepTime').textContent = recipe.prep_time ? `${recipe.prep_time} min` : '-';
	document.getElementById('cookTime').textContent = recipe.cook_time ? `${recipe.cook_time} min` : '-';
	document.getElementById('servings').textContent = recipe.servings || '-';
	document.getElementById('servingSize').textContent = recipe.serving_size || '-';  // ← ADD THIS

	// Ingredients
	const ingredientsList = document.getElementById('ingredientsList');
	ingredientsList.innerHTML = '';
	if (recipe.ingredients && recipe.ingredients.length > 0) {
		recipe.ingredients.forEach(ingredient => {
			const li = document.createElement('li');
			li.className = 'flex items-start';
			li.innerHTML = `
                <span class="text-pink-dark mr-2">•</span>
                <span class="text-gray-700">${ingredient}</span>
            `;
			ingredientsList.appendChild(li);
		});
	}

	// Steps
	const stepsList = document.getElementById('stepsList');
	stepsList.innerHTML = '';
	if (recipe.steps && recipe.steps.length > 0) {
		recipe.steps.forEach((step, index) => {
			const li = document.createElement('li');
			li.className = 'flex items-start';
			li.innerHTML = `
                <span class="flex-shrink-0 w-8 h-8 bg-pink-dark text-white rounded-full flex items-center justify-center mr-3 font-semibold">
                    ${index + 1}
                </span>
                <span class="text-gray-700 pt-1">${step}</span>
            `;
			stepsList.appendChild(li);
		});
	}

	// Nutrition data
	const nutritionBtn = document.getElementById('nutritionBtn');
	if (recipe.nutrition_per_serving) {
		nutritionBtn.classList.remove('hidden');
		displayNutrition(recipe.nutrition_per_serving); // From utils.js
	} else {
		nutritionBtn.classList.add('hidden');
	}
}

// logout() and showMessage() and toggleNutrition() are now in utils.js - removed from here!