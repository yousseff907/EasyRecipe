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
				const card = document.createElement('div');
				card.className = 'bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden border border-gray-100';
				card.onclick = () => window.location.href = `/recipe?id=${recipe.id}&username=${username}`;

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

				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('recipesLoading').classList.add('hidden');
			document.getElementById('recipesEmpty').classList.remove('hidden');
		});
}
