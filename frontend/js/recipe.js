// Get recipe ID from URL and load recipe
window.addEventListener('DOMContentLoaded', () => {
	checkAuth();

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
		headers: { 'Authorization': `Bearer ${token}` }
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
			if (data) displayRecipe(data);
		})
		.catch(() => {
			document.getElementById('loading').classList.add('hidden');
			showMessage('Failed to load recipe', true);
		});
}

// Function: Display recipe details
function displayRecipe(recipe) {
	document.getElementById('loading').classList.add('hidden');
	document.getElementById('recipeContent').classList.remove('hidden');

	// Store recipe state globally for use by button functions
	window.currentRecipeId = recipe.id;
	window.currentIsPublic = recipe.is_public;
	window.currentIsFavorited = recipe.is_favorited;

	// Title
	document.getElementById('recipeTitle').textContent = recipe.title || 'Untitled Recipe';

	// Times and servings
	document.getElementById('prepTime').textContent = recipe.prep_time ? `${recipe.prep_time} min` : '-';
	document.getElementById('cookTime').textContent = recipe.cook_time ? `${recipe.cook_time} min` : '-';
	document.getElementById('servings').textContent = recipe.servings || '-';
	document.getElementById('servingSize').textContent = recipe.serving_size || '-';

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
		displayNutrition(recipe.nutrition_per_serving);
	} else {
		nutritionBtn.classList.add('hidden');
	}

	// Show owner-only buttons
	const isOwner = recipe.owner_id === recipe.current_user_id;
	if (isOwner) {
		document.getElementById('downloadBtn').classList.remove('hidden');
		document.getElementById('deleteBtn').classList.remove('hidden');
		document.getElementById('privacyBtn').classList.remove('hidden');
	}

	// Set initial state of privacy button
	updatePrivacyBtn(recipe.is_public);

	// Set initial state of favorite button
	updateFavoriteBtn(recipe.is_favorited);
}

// Helper: Update privacy button text and style (never touches hidden class)
function updatePrivacyBtn(isPublic) {
	const btn = document.getElementById('privacyBtn');
	if (isPublic) {
		btn.textContent = 'Public';
		btn.classList.remove('border-pink-dark', 'text-pink-dark', 'hover:bg-pink-light');
		btn.classList.add('border-gray-400', 'text-gray-600', 'hover:bg-gray-100');
	} else {
		btn.textContent = 'Private';
		btn.classList.remove('border-gray-400', 'text-gray-600', 'hover:bg-gray-100');
		btn.classList.add('border-pink-dark', 'text-pink-dark', 'hover:bg-pink-light');
	}
}

// Helper: Update favorite button text and style
function updateFavoriteBtn(isFavorited) {
	const btn = document.getElementById('favoriteBtn');
	if (isFavorited) {
		btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-5-7 5V5z" /></svg> Saved`;
		btn.className = 'px-6 font-semibold py-3 rounded-lg transition shadow-md hover:shadow-lg flex items-center gap-2 border-2 border-pink-dark bg-pink-dark text-white hover:bg-pink-medium';
	} else {
		btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-5-7 5V5z" /></svg> Save`;
		btn.className = 'px-6 font-semibold py-3 rounded-lg transition shadow-md hover:shadow-lg flex items-center gap-2 border-2 border-pink-dark text-pink-dark hover:bg-pink-light';
	}
}

// Function: Toggle public/private
function togglePrivacy() {
	const token = localStorage.getItem('auth_token');
	const recipeId = window.currentRecipeId;

	fetch(`${API_URL}/api/recipes/${recipeId}`, {
		method: 'PATCH',
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(response => response.json())
		.then(data => {
			if (data.is_public !== undefined) {
				window.currentIsPublic = data.is_public;
				updatePrivacyBtn(data.is_public);
				showMessage(data.is_public ? 'Recipe is now public' : 'Recipe is now private', false);
			} else {
				showMessage(data.detail || 'Failed to update privacy', true);
			}
		})
		.catch(() => showMessage('Failed to update privacy', true));
}

// Function: Toggle favorite
function toggleFavorite() {
	const token = localStorage.getItem('auth_token');
	const recipeId = window.currentRecipeId;
	const isFavorited = window.currentIsFavorited;

	const method = isFavorited ? 'DELETE' : 'POST';

	fetch(`${API_URL}/api/recipes/${recipeId}/favorite`, {
		method: method,
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(response => response.json())
		.then(data => {
			if (!data.detail) {
				window.currentIsFavorited = !isFavorited;
				updateFavoriteBtn(window.currentIsFavorited);
				showMessage(window.currentIsFavorited ? 'Recipe saved to favorites!' : 'Recipe removed from favorites', false);
			} else {
				showMessage(data.detail || 'Failed to update favorite', true);
			}
		})
		.catch(() => showMessage('Failed to update favorite', true));
}

// Function: Download video
function downloadVideo() {
	const token = localStorage.getItem('auth_token');
	const recipeId = window.currentRecipeId;

	if (!recipeId) return;

	showMessage('Downloading video...', false);

	fetch(`${API_URL}/api/recipes/${recipeId}/download-video`, {
		method: 'GET',
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(response => {
			if (response.ok) return response.blob();
			throw new Error('Download failed');
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
		.catch(() => showMessage('Failed to download video', true));
}

// Function: Delete recipe
function deleteRecipe() {
	const recipeId = window.currentRecipeId;
	if (!recipeId) return;

	if (!confirm('Are you sure you want to delete this recipe?')) return;

	const token = localStorage.getItem('auth_token');

	fetch(`${API_URL}/api/recipes/${recipeId}`, {
		method: 'DELETE',
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(response => response.json())
		.then(data => {
			if (data.message) {
				showMessage('Recipe deleted!', false);
				setTimeout(() => { window.location.href = '/recipes'; }, 1000);
			} else {
				showMessage('Failed to delete recipe', true);
			}
		})
		.catch(() => showMessage('Failed to delete recipe', true));
}