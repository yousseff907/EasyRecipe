window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
	loadFavorites();
	loadRecipes();
});

function loadFavorites() {
	const token = localStorage.getItem('auth_token');
	fetch(`${API_URL}/api/recipes/favorites`, {
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(r => r.json())
		.then(data => {
			document.getElementById('favoritesLoading').classList.add('hidden');
			if (!data.recipes || data.recipes.length === 0) {
				document.getElementById('favoritesEmpty').classList.remove('hidden');
				return;
			}
			const grid = document.getElementById('favoritesGrid');
			grid.classList.remove('hidden');
			data.recipes.slice(0, 3).forEach(recipe => {
				const card = createRecipeCard(recipe, () => viewRecipe(recipe.id));
				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('favoritesLoading').classList.add('hidden');
			document.getElementById('favoritesEmpty').classList.remove('hidden');
		});
}

function loadRecipes() {
	const token = localStorage.getItem('auth_token');

	document.getElementById('loading').classList.remove('hidden');
	document.getElementById('recipesList').classList.add('hidden');

	fetch(`${API_URL}/api/recipes`, {
		method: 'GET',
		headers: { 'Authorization': `Bearer ${token}` }
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
				// Pre-cache individual recipes for offline
				if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
					const token = localStorage.getItem('auth_token');
					navigator.serviceWorker.controller.postMessage({
						type: 'CACHE_RECIPES',
						recipes: data.recipes,
						token: token
					});
				}
			}
		})
		.catch(() => {
			document.getElementById('loading').classList.add('hidden');
			showMessage('Failed to load recipes', true);
		});
}

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
		const card = createRecipeCard(recipe, () => viewRecipe(recipe.id));
		recipesGrid.appendChild(card);
	});
}

function viewRecipe(recipeId) {
	window.location.href = `/recipe?id=${recipeId}`;
}