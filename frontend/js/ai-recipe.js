// Check authentication
window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
});

let currentRecipe = null;

// Generate recipe from ingredients
async function generateRecipe() {
	const ingredientsText = document.getElementById('ingredients').value;
	const instructions = document.getElementById('instructions').value.trim();

	// Parse ingredients
	const ingredients = ingredientsText
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	// Validate
	if (ingredients.length === 0) {
		showMessage('Please enter at least one ingredient', true);
		return;
	}

	if (ingredients.length > 100) {
		showMessage('Maximum 100 ingredients allowed', true);
		return;
	}

	// Show loading
	document.getElementById('inputForm').classList.add('hidden');
	document.getElementById('recipeDisplay').classList.add('hidden');
	document.getElementById('loading').classList.remove('hidden');

	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch(`${API_URL}/api/make_your_own_with_ai`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({
				ingredients: ingredients,
				instructions: instructions
			})
		});

		if (response.status === 401) {
			localStorage.removeItem('auth_token');
			window.location.href = '/login';
			return;
		}

		const data = await response.json();

		document.getElementById('loading').classList.add('hidden');

		if (data.status === 'success') {
			showMessage('Recipe generated! Redirecting...', false);
			setTimeout(() => {
				window.location.href = `/recipe?id=${data.recipe_id}`;
			}, 1500);
		} else {
			document.getElementById('inputForm').classList.remove('hidden');
			showMessage(data.detail || 'Failed to generate recipe', true);
		}
	} catch (error) {
		document.getElementById('loading').classList.add('hidden');
		document.getElementById('inputForm').classList.remove('hidden');
		showMessage('Error generating recipe. Please try again.', true);
	}
}

// Display the generated recipe
function displayRecipe(recipe) {
	document.getElementById('recipeDisplay').classList.remove('hidden');

	// Title
	document.getElementById('recipeTitle').textContent = recipe.title || 'Generated Recipe';

	// Times and servings
	document.getElementById('prepTime').textContent = recipe.prep_time ? `${recipe.prep_time} min` : '-';
	document.getElementById('cookTime').textContent = recipe.cook_time ? `${recipe.cook_time} min` : '-';
	document.getElementById('servings').textContent = recipe.servings || '-';
	document.getElementById('servingSize').textContent = recipe.serving_size || '-';

	// Ingredients
	const ingredientsList = document.getElementById('ingredientsList');
	ingredientsList.innerHTML = '';
	if (recipe.ingredients && recipe.ingredients.length > 0) {
		recipe.ingredients.forEach(ingredient => {
			const li = document.createElement('li');
			li.className = 'flex items-start';
			li.innerHTML = `
                <span class="text-pink-dark mr-2">•</span>
                <span class="text-gray-700">${ingredient}</span>
            `;
			ingredientsList.appendChild(li);
		});
	}

	// Steps
	const stepsList = document.getElementById('stepsList');
	stepsList.innerHTML = '';
	if (recipe.steps && recipe.steps.length > 0) {
		recipe.steps.forEach((step, index) => {
			const li = document.createElement('li');
			li.className = 'flex items-start';
			li.innerHTML = `
                <span class="flex-shrink-0 w-8 h-8 bg-pink-dark text-white rounded-full flex items-center justify-center mr-3 font-semibold">
                    ${index + 1}
                </span>
                <span class="text-gray-700 pt-1">${step}</span>
            `;
			stepsList.appendChild(li);
		});
	}

	// Nutrition
	if (recipe.nutrition_per_serving) {
		displayNutrition(recipe.nutrition_per_serving);
	}
}

// Save the generated recipe
async function saveRecipe() {
	if (!currentRecipe) return;

	const saveBtn = document.getElementById('saveBtn');
	saveBtn.disabled = true;
	saveBtn.textContent = 'Saving...';

	showMessage('Recipe already saved! Redirecting...', false);
	setTimeout(() => {
		window.location.href = '/recipes';
	}, 1500);
}

// Reset form to try again
function resetForm() {
	currentRecipe = null;
	document.getElementById('ingredients').value = '';
	document.getElementById('instructions').value = '';
	document.getElementById('inputForm').classList.remove('hidden');
	document.getElementById('recipeDisplay').classList.add('hidden');
	document.getElementById('nutritionPanel').classList.add('hidden');
	document.getElementById('charCount').textContent = '0';
}