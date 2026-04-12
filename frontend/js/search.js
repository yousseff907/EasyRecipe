let currentType = 'recipes';

window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
});

function setType(type) {
	currentType = type;

	const btnRecipes = document.getElementById('btnRecipes');
	const btnUsers = document.getElementById('btnUsers');

	if (type === 'recipes') {
		btnRecipes.className = 'px-8 py-2 font-semibold transition bg-pink-dark text-white';
		btnUsers.className = 'px-8 py-2 font-semibold transition bg-white text-pink-dark';
	} else {
		btnUsers.className = 'px-8 py-2 font-semibold transition bg-pink-dark text-white';
		btnRecipes.className = 'px-8 py-2 font-semibold transition bg-white text-pink-dark';
	}

	// Clear results when switching type
	document.getElementById('results').classList.add('hidden');
	document.getElementById('emptyState').classList.add('hidden');
	document.getElementById('resultsGrid').innerHTML = '';
	document.getElementById('searchInput').value = '';
}

function doSearch() {
	const query = document.getElementById('searchInput').value.trim();

	if (!query) {
		showMessage('Please enter a search term', true);
		return;
	}

	const token = localStorage.getItem('auth_token');

	document.getElementById('loading').classList.remove('hidden');
	document.getElementById('results').classList.add('hidden');
	document.getElementById('emptyState').classList.add('hidden');

	fetch(`${API_URL}/api/search?query=${encodeURIComponent(query)}&type=${currentType}`, {
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

			if (!data) return;

			if (data.message) {
				document.getElementById('emptyState').classList.remove('hidden');
				return;
			}

			if (currentType === 'recipes' && data.recipes) {
				displayRecipes(data.recipes);
			} else if (currentType === 'users' && data.users) {
				displayUsers(data.users);
			}
		})
		.catch(() => {
			document.getElementById('loading').classList.add('hidden');
			showMessage('Search failed. Please try again.', true);
		});
}

function displayRecipes(recipes) {
	const grid = document.getElementById('resultsGrid');
	const results = document.getElementById('results');
	const emptyState = document.getElementById('emptyState');

	if (recipes.length === 0) {
		emptyState.classList.remove('hidden');
		return;
	}

	grid.innerHTML = '';
	results.classList.remove('hidden');

	recipes.forEach(recipe => {
		const card = createRecipeCard(recipe, () => viewRecipe(recipe.id));
		card.className = 'bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden border border-gray-100';
		card.onclick = () => window.location.href = `/recipe?id=${recipe.id}&from=search`;

		grid.appendChild(card);
	});
}

function displayUsers(users) {
	const grid = document.getElementById('resultsGrid');
	const results = document.getElementById('results');
	const emptyState = document.getElementById('emptyState');

	if (users.length === 0) {
		emptyState.classList.remove('hidden');
		return;
	}

	grid.innerHTML = '';
	results.classList.remove('hidden');

	users.forEach(user => {
		const card = document.createElement('div');
		card.className = 'bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden border border-gray-100';
		card.onclick = () => window.location.href = `/user/${user.username}`;

		card.innerHTML = `
			<div class="p-6 flex items-center gap-4">
				<div class="w-12 h-12 rounded-full bg-pink-light flex items-center justify-center text-pink-dark font-bold text-xl">
					${user.username.charAt(0).toUpperCase()}
				</div>
				<div>
					<h3 class="text-lg font-bold text-gray-800">@${user.username}</h3>
				</div>
			</div>
			<div class="bg-pink-light px-6 py-3 text-pink-dark font-semibold text-sm">
				View Profile →
			</div>
		`;

		grid.appendChild(card);
	});
}
