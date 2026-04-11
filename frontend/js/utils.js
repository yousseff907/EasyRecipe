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