// Shared utility functions used across all pages

const API_URL = '';

// Check authentication and redirect if not logged in
function checkAuth() {
	const token = localStorage.getItem('auth_token');
	if (!token) {
		window.location.href = '/login';
		return false;
	}
	return true;
}

// Toggle mobile menu
function toggleMenu() {
	const menu = document.getElementById('mobileMenu');
	menu.classList.toggle('hidden');
}

// Close menu when clicking outside
document.addEventListener('click', (e) => {
	const menu = document.getElementById('mobileMenu');
	const menuBtn = document.getElementById('menuBtn');
	if (menu && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
		menu.classList.add('hidden');
	}
});

// Logout function
function logout() {
	localStorage.removeItem('auth_token');
	window.location.href = '/login';
}

// Show message to user
function showMessage(text, isError) {
	const msgDiv = document.getElementById('message');
	msgDiv.textContent = text;
	msgDiv.className = isError
		? 'mt-4 p-4 rounded-lg bg-red-100 text-red-700'
		: 'mt-4 p-4 rounded-lg bg-green-100 text-green-700';
	msgDiv.classList.remove('hidden');

	if (!isError) {
		setTimeout(() => {
			msgDiv.classList.add('hidden');
		}, 3000);
	}
}

// Toggle nutrition panel
function toggleNutrition() {
	const panel = document.getElementById('nutritionPanel');
	const btn = document.getElementById('nutritionBtn');

	if (panel.classList.contains('hidden')) {
		panel.classList.remove('hidden');
		btn.textContent = 'Hide Nutritional Facts';
	} else {
		panel.classList.add('hidden');
		btn.textContent = 'Show Nutritional Facts';
	}
}

// Display nutrition data
function displayNutrition(nutrition) {
	if (nutrition) {
		document.getElementById('nutritionCalories').textContent = nutrition.calories || '-';
		document.getElementById('nutritionProtein').textContent = nutrition.protein_g ? `${nutrition.protein_g}g` : '-';
		document.getElementById('nutritionCarbs').textContent = nutrition.carbs_g ? `${nutrition.carbs_g}g` : '-';
		document.getElementById('nutritionFat').textContent = nutrition.fat_g ? `${nutrition.fat_g}g` : '-';
	}
}

// Update character count for textareas
function updateCharCount(textareaId, counterId, maxLength) {
	const textarea = document.getElementById(textareaId);
	const counter = document.getElementById(counterId);
	const length = textarea.value.length;

	counter.textContent = length;

	if (length > maxLength * 0.9) {
		counter.className = 'text-red-500 font-semibold';
	} else if (length > maxLength * 0.7) {
		counter.className = 'text-yellow-600';
	} else {
		counter.className = '';
	}
}

function shareRecipe(recipeId) {
	const url = `https://www.easyrecipe.online/r/${recipeId}`;
	navigator.clipboard.writeText(url).then(() => {
		const toast = document.createElement('div');
		toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 font-semibold';
		toast.textContent = 'Link copied to clipboard!';
		document.body.appendChild(toast);
		setTimeout(() => toast.remove(), 3000);
	});
}

function createRecipeCard(recipe, onclick) {
	const card = document.createElement('div');
	card.className = 'bg-white rounded-xl shadow-md hover:shadow-xl transition cursor-pointer overflow-hidden';
	card.onclick = onclick;
	card.innerHTML = `
		<div class="p-6">
			<h3 class="text-xl font-bold text-gray-800 mb-2 line-clamp-2">${recipe.title || 'Untitled Recipe'}</h3>
			${recipe.owner_username ? `<p class="text-xs text-pink-dark mb-2">by @${recipe.owner_username}</p>` : ''}
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
	return card;
}