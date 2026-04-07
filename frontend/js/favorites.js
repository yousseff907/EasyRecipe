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

	fetch(`${API_URL}/api/recipes/favorites`, {
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
                    Created ${new Date(recipe.created_at).toLocaleDateString()}
                </p>
            </div>
            <div class="bg-pink-light px-6 py-3 text-pink-dark font-semibold text-sm">
                View Recipe →
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