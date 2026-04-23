window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
	loadUserInfo();
	loadMyRecipes();
	loadMyFavorites();
	loadFeed();

	// iOS guide
	const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
	const isStandalone = window.navigator.standalone;
	if (isIOS && !isStandalone) {
		document.getElementById('iosGuide').classList.remove('hidden');
	}

	// Android install
	let deferredPrompt = null;
	window.addEventListener('beforeinstallprompt', (e) => {
		e.preventDefault();
		deferredPrompt = e;
		document.getElementById('installBanner').classList.remove('hidden');
	});

	document.getElementById('installBtn').addEventListener('click', () => {
		if (!deferredPrompt) return;
		deferredPrompt.prompt();
		deferredPrompt.userChoice.then(() => {
			deferredPrompt = null;
			document.getElementById('installBanner').classList.add('hidden');
		});
	});

	window.addEventListener('appinstalled', () => {
		document.getElementById('installBanner').classList.add('hidden');
	});
});

function loadUserInfo() {
	const token = localStorage.getItem('auth_token');
	fetch('/api/user/me', {
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(r => r.json())
		.then(data => {
			if (data.username) {
				document.getElementById('welcomeMsg').textContent = `Welcome back, ${data.username}!`;
			}
		})
		.catch(() => { });
}

function loadMyRecipes() {
	const token = localStorage.getItem('auth_token');
	fetch('/api/recipes', {
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(r => r.json())
		.then(data => {
			document.getElementById('myRecipesLoading').classList.add('hidden');
			if (!data.recipes || data.recipes.length === 0) {
				document.getElementById('myRecipesEmpty').classList.remove('hidden');
				return;
			}
			const grid = document.getElementById('myRecipesGrid');
			grid.classList.remove('hidden');
			data.recipes.slice(0, 3).forEach(recipe => {
				const card = createRecipeCard(recipe, () => window.location.href = `/recipe?id=${recipe.id}&from=home`);
				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('myRecipesLoading').classList.add('hidden');
			document.getElementById('myRecipesEmpty').classList.remove('hidden');
		});
}

function loadMyFavorites() {
	const token = localStorage.getItem('auth_token');
	fetch('/api/recipes/favorites', {
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(r => r.json())
		.then(data => {
			document.getElementById('myFavoritesLoading').classList.add('hidden');
			if (!data.recipes || data.recipes.length === 0) {
				document.getElementById('myFavoritesEmpty').classList.remove('hidden');
				return;
			}
			const grid = document.getElementById('myFavoritesGrid');
			grid.classList.remove('hidden');
			data.recipes.slice(0, 3).forEach(recipe => {
				const card = createRecipeCard(recipe, () => window.location.href = `/recipe?id=${recipe.id}&from=home`);
				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('myFavoritesLoading').classList.add('hidden');
			document.getElementById('myFavoritesEmpty').classList.remove('hidden');
		});
}

function loadFeed() {
	const token = localStorage.getItem('auth_token');
	fetch('/api/home/feed', {
		headers: { 'Authorization': `Bearer ${token}` }
	})
		.then(r => r.json())
		.then(data => {
			document.getElementById('feedLoading').classList.add('hidden');
			if (!data.recipes || data.recipes.length === 0) {
				document.getElementById('feedEmpty').classList.remove('hidden');
				return;
			}
			const grid = document.getElementById('feedGrid');
			grid.classList.remove('hidden');
			data.recipes.forEach(recipe => {
				const card = createRecipeCard(recipe, () => window.location.href = `/recipe?id=${recipe.id}&from=home`);
				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('feedLoading').classList.add('hidden');
			document.getElementById('feedEmpty').classList.remove('hidden');
		});
}
