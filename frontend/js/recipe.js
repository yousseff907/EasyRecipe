// Get recipe ID from URL and load recipe
window.addEventListener('DOMContentLoaded', () => {
	checkAuth(); // From utils.js

	const urlParams = new URLSearchParams(window.location.search);
	const recipeId = urlParams.get('id');

	if (!recipeId) {
		window.location.href = '/recipes';
		return;
	}

	loadRecipe(recipeId);
});

// Function: Load single recipe
function loadRecipe(recipeId) {
	const token = localStorage.getItem('auth_token');

	document.getElementById('loading').classList.remove('hidden');
	document.getElementById('recipeContent').classList.add('hidden');

	fetch(`${API_URL}/api/recipes/${recipeId}`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${token}`
		}
	})
		.then(response => {
			if (response.status === 401) {
				localStorage.removeItem('auth_token');
				window.location.href = '/login';
				return;
			}
			if (response.status === 404) {
				showMessage('Recipe not found', true);
				return;
			}
			return response.json();
		})
		.then(data => {
			if (data) {
				displayRecipe(data);
			}
		})
		.catch(error => {
			document.getElementById('loading').classList.add('hidden');
			showMessage('Failed to load recipe', true);
		});
}

// Function: Display recipe details
function displayRecipe(recipe) {
	document.getElementById('loading').classList.add('hidden');
	document.getElementById('recipeContent').classList.remove('hidden');

	window.currentRecipeId = recipe.id;

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
			li.className = 'flex items-start py-2';
			li.innerHTML = `
                <span class="text-pink-dark mr-3 font-bold">•</span>
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
			li.className = 'flex items-start mb-4';
			li.innerHTML = `
                <span class="flex-shrink-0 w-10 h-10 bg-pink-dark text-white rounded-full flex items-center justify-center mr-4 font-bold text-lg">
                    ${index + 1}
                </span>
                <span class="text-gray-700 pt-2">${step}</span>
            `;
			stepsList.appendChild(li);
		});
	}

	// Nutrition
	const nutritionBtn = document.getElementById('nutritionBtn');
	if (recipe.nutrition_per_serving) {
		nutritionBtn.classList.remove('hidden');
		displayNutrition(recipe.nutrition_per_serving); // From utils.js
	} else {
		nutritionBtn.classList.add('hidden');
	}
}

// Function: Download video
function downloadVideo() {
	const token = localStorage.getItem('auth_token');
	const recipeId = window.currentRecipeId;

	if (!recipeId) return;

	showMessage('Downloading video...', false);

	fetch(`${API_URL}/api/recipes/${recipeId}/download-video`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${token}`
		}
	})
		.then(response => {
			if (response.ok) {
				return response.blob();
			} else {
				throw new Error('Download failed');
			}
		})
		.then(blob => {
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'recipe_video.mp4';
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);
			showMessage('Video downloaded!', false);
		})
		.catch(error => {
			showMessage('Failed to download video', true);
		});
}

// Function: Delete recipe
function deleteRecipe() {
	const recipeId = window.currentRecipeId;

	if (!recipeId) return;

	if (!confirm('Are you sure you want to delete this recipe?')) {
		return;
	}

	const token = localStorage.getItem('auth_token');

	fetch(`${API_URL}/api/recipes/${recipeId}`, {
		method: 'DELETE',
		headers: {
			'Authorization': `Bearer ${token}`
		}
	})
		.then(response => response.json())
		.then(data => {
			if (data.message) {
				showMessage('Recipe deleted!', false);
				setTimeout(() => {
					window.location.href = '/recipes';
				}, 1000);
			} else {
				showMessage('Failed to delete recipe', true);
			}
		})
		.catch(error => {
			showMessage('Failed to delete recipe', true);
		});
}

// logout(), showMessage(), toggleNutrition(), displayNutrition() are now in utils.js - removed from here!