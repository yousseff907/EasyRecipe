// API Base URL
const API_URL = '';

// Check if user is logged in on page load
window.addEventListener('DOMContentLoaded', () => {
	const token = localStorage.getItem('auth_token');
	if (!token) {
		window.location.href = '/login';
	}
});

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
				// Token expired, redirect to login
				localStorage.removeItem('auth_token');
				window.location.href = '/login';
				return;
			}
			return response.json();
		})
		.then(data => {
			// Hide loading
			document.getElementById('loading').classList.add('hidden');
			document.getElementById('extractBtn').disabled = false;

			if (data.status === 'success') {
				displayRecipe(data.recipe);
				showMessage('Recipe extracted successfully!', false);
			} else {
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

	// Nutrition data (hidden by default)
	if (recipe.nutrition_per_serving) {
		const nutrition = recipe.nutrition_per_serving;
		document.getElementById('nutritionCalories').textContent = nutrition.calories || '-';
		document.getElementById('nutritionProtein').textContent = nutrition.protein_g ? `${nutrition.protein_g}g` : '-';
		document.getElementById('nutritionCarbs').textContent = nutrition.carbs_g ? `${nutrition.carbs_g}g` : '-';
		document.getElementById('nutritionFat').textContent = nutrition.fat_g ? `${nutrition.fat_g}g` : '-';
	}
}
// Function: Logout
function logout() {
	localStorage.removeItem('auth_token');
	window.location.href = '/login';
}

// Helper: Show message
function showMessage(text, isError) {
	const msgDiv = document.getElementById('message');
	msgDiv.textContent = text;
	msgDiv.className = isError
		? 'mt-4 p-4 rounded-lg bg-red-100 text-red-700'
		: 'mt-4 p-4 rounded-lg bg-green-100 text-green-700';
	msgDiv.classList.remove('hidden');

	// Auto-hide success messages
	if (!isError) {
		setTimeout(() => {
			msgDiv.classList.add('hidden');
		}, 3000);
	}
}

// Function: Toggle nutrition panel visibility
function toggleNutrition() {
	const panel = document.getElementById('nutritionPanel');
	const btn = document.getElementById('nutritionBtn');

	if (panel.classList.contains('hidden')) {
		panel.classList.remove('hidden');
		btn.textContent = '📊 Hide Nutritional Facts';
	} else {
		panel.classList.add('hidden');
		btn.textContent = '📊 Show Nutritional Facts';
	}
}

// Function: Update character count
function updateCharCount() {
	const textarea = document.getElementById('instructions');
	const counter = document.getElementById('charCount');
	const length = textarea.value.length;

	counter.textContent = length;

	// Change color based on usage
	if (length > 270) {
		counter.className = 'text-red-500 font-semibold';
	} else if (length > 200) {
		counter.className = 'text-yellow-600';
	} else {
		counter.className = '';
	}
}