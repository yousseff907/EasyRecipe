window.addEventListener('DOMContentLoaded', () => {
	checkAuth();

	// Get username from URL path e.g. /user/youssef
	const pathParts = window.location.pathname.split('/');
	const username = pathParts[pathParts.length - 1];

	if (!username) {
		window.location.href = '/search';
		return;
	}

	loadProfile(username);
});

function loadProfile(username) {
	const token = localStorage.getItem('auth_token');

	fetch(`${API_URL}/api/user/${username}`, {
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
				document.getElementById('loading').classList.add('hidden');
				document.getElementById('notFound').classList.remove('hidden');
				return;
			}
			return response.json();
		})
		.then(data => {
			if (!data) return;

			document.getElementById('loading').classList.add('hidden');
			document.getElementById('profileContent').classList.remove('hidden');

			// Avatar — first letter of username
			document.getElementById('profileAvatar').textContent = data.username.charAt(0).toUpperCase();
			document.getElementById('profileUsername').textContent = '@' + data.username;
			document.getElementById('profileBio').textContent = data.bio || 'No bio yet.';
			document.getElementById('profileRecipeCount').textContent = `${data.public_recipe_count} public recipe(s)`;

			document.title = `${data.username} - EasyRecipe`;

			loadUserRecipes(username, token);
		})
		.catch(() => {
			document.getElementById('loading').classList.add('hidden');
			showMessage('Failed to load profile', true);
		});
}

function loadUserRecipes(username, token) {
	fetch(`${API_URL}/api/user/${username}/recipes`, {
		method: 'GET',
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(response => response.json())
		.then(data => {
			document.getElementById('recipesLoading').classList.add('hidden');

			if (!data.recipes || data.recipes.length === 0) {
				document.getElementById('recipesEmpty').classList.remove('hidden');
				return;
			}

			const grid = document.getElementById('recipesGrid');
			grid.classList.remove('hidden');
			grid.innerHTML = '';

			data.recipes.forEach(recipe => {
				const card = createRecipeCard(recipe, () => viewRecipe(recipe.id));
				card.onclick = () => window.location.href = `/recipe?id=${recipe.id}&username=${username}`;

				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('recipesLoading').classList.add('hidden');
			document.getElementById('recipesEmpty').classList.remove('hidden');
		});
}
