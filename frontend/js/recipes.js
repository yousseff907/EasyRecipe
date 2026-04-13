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
		const card = createRecipeCard(recipe, () => viewRecipe(recipe.id));

		recipesGrid.appendChild(card);
	});
}

// Function: Navigate to recipe detail
function viewRecipe(recipeId) {
	window.location.href = `/recipe?id=${recipeId}`;
}

// logout() and showMessage() are now in utils.js - removed from here!