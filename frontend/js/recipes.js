// API Base URL
const API_URL = '';

// Check auth and load recipes on page load
window.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    loadRecipes();
});

// Function: Load all recipes
function loadRecipes() {
    const token = localStorage.getItem('auth_token');
    
    // Show loading
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('emptyState').classList.add('hidden');
    document.getElementById('recipesList').classList.add('hidden');
    
    // Call backend
    fetch(`${API_URL}/api/recipes`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (response.status === 401) {
            localStorage.removeItem('auth_token');
            window.location.href = 'login.html';
            return;
        }
        return response.json();
    })
    .then(data => {
        // Hide loading
        document.getElementById('loading').classList.add('hidden');
        
        if (data.recipes && data.recipes.length > 0) {
            displayRecipes(data.recipes);
        } else {
            // Show empty state
            document.getElementById('emptyState').classList.remove('hidden');
        }
    })
    .catch(error => {
        document.getElementById('loading').classList.add('hidden');
        showMessage('Failed to load recipes', true);
    });
}

// Function: Display recipes as cards
function displayRecipes(recipes) {
    const recipesList = document.getElementById('recipesList');
    recipesList.innerHTML = '';
    recipesList.classList.remove('hidden');
    
    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.className = 'bg-white border-2 border-pink-light rounded-xl p-6 hover:shadow-lg transition cursor-pointer';
        card.onclick = () => viewRecipe(recipe.id);
        
        card.innerHTML = `
            <h3 class="text-xl font-bold text-gray-800 mb-2">${recipe.title}</h3>
            <p class="text-pink-dark text-sm font-medium">Click to view details →</p>
        `;
        
        recipesList.appendChild(card);
    });
}

// Function: Navigate to recipe detail page
function viewRecipe(recipeId) {
    window.location.href = `recipe.html?id=${recipeId}`;
}

// Function: Logout
function logout() {
    localStorage.removeItem('auth_token');
    window.location.href = 'login.html';
}

// Helper: Show message
function showMessage(text, isError) {
    const msgDiv = document.getElementById('message');
    msgDiv.textContent = text;
    msgDiv.className = isError 
        ? 'mt-4 p-4 rounded-lg bg-red-100 text-red-700'
        : 'mt-4 p-4 rounded-lg bg-green-100 text-green-700';
    msgDiv.classList.remove('hidden');
}