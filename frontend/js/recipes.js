// Check authentication and load recipes
window.addEventListener('DOMContentLoaded', () => {
	checkAuth(); // From utils.js
	loadRecipes();
});

// Function: Load all recipes
function loadRecipes() {
	const token = localStorage.getItem('auth_token');

	document.getElementById('loading').classList.remove('hidden');
	document.getElementById('recipesList').classList.add('hidden');

	fetch(`${API_URL}/api/recipes`, {
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
			return response.json();
		})
		.then(data => {
			document.getElementById('loading').classList.add('hidden');

			if (data && data.recipes) {
				displayRecipes(data.recipes);
			}
		})
		.catch(error => {
			document.getElementById('loading').classList.add('hidden');
			showMessage('Failed to load recipes', true);
		});
}

// Function: Display recipes in grid
function displayRecipes(recipes) {
	const recipesList = document.getElementById('recipesList');
	const recipesGrid = document.getElementById('recipesGrid');
	const emptyState = document.getElementById('emptyState');

	if (recipes.length === 0) {
		recipesList.classList.add('hidden');
		emptyState.classList.remove('hidden');
		return;
	}

	recipesList.classList.remove('hidden');
	emptyState.classList.add('hidden');
	recipesGrid.innerHTML = '';

	recipes.forEach(recipe => {
		const card = document.createElement('div');
		card.className = 'bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden';
		card.onclick = () => viewRecipe(recipe.id);

		card.innerHTML = `
			<div class="p-6">
				<h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-2">${recipe.title || 'Untitled Recipe'}</h3>
				<div class="flex items-center text-sm text-gray-600 space-x-4 mb-3">
					<span>${recipe.prep_time ? recipe.prep_time + ' min' : '-'}</span>
					<span>${recipe.cook_time ? recipe.cook_time + ' min' : '-'}</span>
					<span>${recipe.servings || '-'}</span>
				</div>
				<p class="text-xs text-gray-500">
					Created ${recipe.created_at ? new Date(recipe.created_at + 'Z').toLocaleDateString() : ''}
				</p>
			</div>
			<div class="bg-pink-light px-6 py-3 flex items-center justify-between">
				<span class="text-pink-dark font-semibold text-sm">View Recipe →</span>
				${recipe.is_public ? `
				<button onclick="event.stopPropagation(); shareRecipe(${recipe.id})" 
					class="text-pink-dark hover:text-pink-medium transition p-1">
					<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
					</svg>
				</button>` : ''}
			</div>
		`;

		recipesGrid.appendChild(card);
	});
}

// Function: Navigate to recipe detail
function viewRecipe(recipeId) {
	window.location.href = `/recipe?id=${recipeId}`;
}

// logout() and showMessage() are now in utils.js - removed from here!