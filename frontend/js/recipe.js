window.addEventListener('DOMContentLoaded', () => {
	checkAuth();

	const urlParams = new URLSearchParams(window.location.search);
	const recipeId = urlParams.get('id');
	const username = urlParams.get('username');

	if (!recipeId) {
		window.location.href = '/recipes';
		return;
	}

	if (username) {
		loadRecipeFromProfile(recipeId, username);
	} else {
		loadRecipe(recipeId);
	}
});

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

function loadRecipeFromProfile(recipeId, username) {
	const token = localStorage.getItem('auth_token');

	document.getElementById('loading').classList.remove('hidden');
	document.getElementById('recipeContent').classList.add('hidden');

	fetch(`${API_URL}/api/user/${encodeURIComponent(username)}/recipes/${encodeURIComponent(recipeId)}`, {
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

function displayRecipe(recipe) {
	document.getElementById('loading').classList.add('hidden');
	document.getElementById('recipeContent').classList.remove('hidden');

	window.currentRecipeId = recipe.id;
	window.currentIsPublic = recipe.is_public;
	window.currentIsFavorited = recipe.is_favorited;

	document.getElementById('recipeTitle').textContent = recipe.title || 'Untitled Recipe';
	const owner = recipe.owner_username;
	document.getElementById('recipeOwner').innerHTML = `by <a href="/user/${encodeURIComponent(owner)}" class="hover:underline">@${escapeHtml(owner)}</a>`;

	document.getElementById('prepTime').textContent = recipe.prep_time ? `${recipe.prep_time} min` : '-';
	document.getElementById('cookTime').textContent = recipe.cook_time ? `${recipe.cook_time} min` : '-';
	document.getElementById('servings').textContent = recipe.servings || '-';
	document.getElementById('servingSize').textContent = recipe.serving_size || '-';

	const ingredientsList = document.getElementById('ingredientsList');
	ingredientsList.innerHTML = '';
	if (recipe.ingredients && recipe.ingredients.length > 0) {
		recipe.ingredients.forEach(ingredient => {
			const li = document.createElement('li');
			li.className = 'flex items-start py-2';
			li.innerHTML = `
				<span class="text-pink-dark mr-3 font-bold">•</span>
				<span class="text-gray-700 break-words min-w-0">${escapeHtml(ingredient)}</span>
			`;
			ingredientsList.appendChild(li);
		});
	}

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
				<span class="text-gray-700 pt-2 break-words min-w-0">${escapeHtml(step)}</span>
			`;
			stepsList.appendChild(li);
		});
	}

	const nutritionBtn = document.getElementById('nutritionBtn');
	if (recipe.nutrition_per_serving) {
		nutritionBtn.classList.remove('hidden');
		displayNutrition(recipe.nutrition_per_serving);
	} else {
		nutritionBtn.classList.add('hidden');
	}

	const isOwner = recipe.owner_id === recipe.current_user_id;
	if (isOwner) {
		document.getElementById('deleteBtn').classList.remove('hidden');
		document.getElementById('privacyBtn').classList.remove('hidden');
		document.getElementById('editBtn').classList.remove('hidden');
	}
	if ((isOwner || recipe.is_public) && recipe.video_url && !recipe.video_url.includes('/photo/')) {
		document.getElementById('downloadBtn').classList.remove('hidden');
	}

	updatePrivacyBtn(recipe.is_public);

	updateFavoriteBtn(recipe.is_favorited);

	if (recipe.is_public) {
		document.getElementById('shareBtn').classList.remove('hidden');
		document.getElementById('pdfBtn').classList.remove('hidden');
	}

	const urlParams = new URLSearchParams(window.location.search);
	const backBtn = document.getElementById('backBtn');
	const username = urlParams.get('username');
	const from = urlParams.get('from');

	if (backBtn && username) {
		backBtn.href = `/user/${encodeURIComponent(username)}`;
		backBtn.textContent = '← Back to Profile';
	} else if (backBtn && from === 'search') {
		backBtn.href = '/search';
		backBtn.textContent = '← Back to Search';
	} else if (backBtn && from === 'home') {
		backBtn.href = '/home';
		backBtn.textContent = '← Back to Home';
	} else if (backBtn) {
		backBtn.textContent = '← Back to Recipes';
	}
}

function shareRecipe() {
	const recipeId = window.currentRecipeId;
	const url = `https://www.easyrecipe.online/r/${recipeId}`;
	navigator.clipboard.writeText(url).then(() => {
		const toast = document.createElement('div');
		toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-semibold';
		toast.textContent = '🔗 Link copied to clipboard!';
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 3000);
	});
}

function downloadPDF() {
    const recipeId = window.currentRecipeId;
    const token = localStorage.getItem('auth_token');
    
    showMessage('Generating PDF...', false);
    
    fetch(`/api/recipes/${recipeId}/pdf`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
        .then(response => {
            if (!response.ok) throw new Error('Failed');
            return response.blob();
        })
        .then(blob => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'recipe.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showMessage('PDF downloaded!', false);
        })
        .catch(() => showMessage('Failed to generate PDF', true));
}

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
				window.location.reload();
			} else {
				showMessage(data.detail || 'Failed to update privacy', true);
			}
		})
		.catch(() => showMessage('Failed to update privacy', true));
}

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