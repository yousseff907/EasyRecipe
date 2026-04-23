document.addEventListener('DOMContentLoaded', () => {
	const token = localStorage.getItem('auth_token') ||
		(document.cookie.match(/auth_token=([^;]+)/) || [])[1];

	fetch('/api/public/recipes')
		.then(r => r.json())
		.then(data => {
			document.getElementById('loading').classList.add('hidden');

			if (!data.recipes || data.recipes.length === 0) {
				document.getElementById('emptyState').classList.remove('hidden');
				return;
			}

			const grid = document.getElementById('recipesGrid');
			grid.classList.remove('hidden');

			data.recipes.forEach(recipe => {
				const card = createRecipeCard(recipe, () => {
					window.location.href = token ? `/recipe?id=${recipe.id}` : `/r/${recipe.id}`;
				});
				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('loading').classList.add('hidden');
			document.getElementById('emptyState').classList.remove('hidden');
		});
});