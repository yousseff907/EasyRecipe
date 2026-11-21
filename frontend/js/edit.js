let recipeId = null;

window.addEventListener('DOMContentLoaded', () => {
	checkAuth();

	const urlParams = new URLSearchParams(window.location.search);
	recipeId = urlParams.get('id');

	if (!recipeId) {
		window.location.href = '/recipes';
		return;
	}

	document.getElementById('backBtn').href = `/recipe?id=${recipeId}`;

	loadRecipe(recipeId);
});

function loadRecipe(id) {
	const token = localStorage.getItem('auth_token');

	fetch(`${API_URL}/api/recipes/${id}`, {
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
			if (!data) return;

			if (data.owner_id !== data.current_user_id) {
				window.location.href = '/recipes';
				return;
			}

			document.getElementById('loading').classList.add('hidden');
			document.getElementById('formContent').classList.remove('hidden');

			document.getElementById('title').value = data.title || '';
			document.getElementById('prepTime').value = data.prep_time || '';
			document.getElementById('cookTime').value = data.cook_time || '';
			document.getElementById('servings').value = data.servings || '';
			document.getElementById('serving_size').value = data.serving_size || '';
			document.getElementById('ingredients').value = data.ingredients.join('\n');
			document.getElementById('steps').value = data.steps.join('\n');

			if (data.nutrition_per_serving) {
				document.getElementById('calories').value = data.nutrition_per_serving.calories || '';
				document.getElementById('protein').value = data.nutrition_per_serving.protein_g || '';
				document.getElementById('carbs').value = data.nutrition_per_serving.carbs_g || '';
				document.getElementById('fat').value = data.nutrition_per_serving.fat_g || '';
			}
		})
		.catch(() => {
			document.getElementById('loading').classList.add('hidden');
			showMessage('Failed to load recipe', true);
		});
}

document.getElementById('recipeForm').addEventListener('submit', async (e) => {
	e.preventDefault();

	const title = document.getElementById('title').value.trim();
	const ingredientsText = document.getElementById('ingredients').value;
	const stepsText = document.getElementById('steps').value;
	const prepTime = document.getElementById('prepTime').value;
	const cookTime = document.getElementById('cookTime').value;
	const servings = document.getElementById('servings').value;
	const servingSize = document.getElementById('serving_size').value;

	const ingredients = ingredientsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
	const steps = stepsText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

	if (!title) { showMessage('Please enter a recipe title', true); return; }
	if (ingredients.length === 0) { showMessage('Please enter at least one ingredient', true); return; }
	if (steps.length === 0) { showMessage('Please enter at least one step', true); return; }
	if (ingredients.length > 100) { showMessage('Maximum 100 ingredients allowed', true); return; }
	if (steps.length > 50) { showMessage('Maximum 50 steps allowed', true); return; }

	const calories = document.getElementById('calories').value;
	const protein = document.getElementById('protein').value;
	const carbs = document.getElementById('carbs').value;
	const fat = document.getElementById('fat').value;

	let nutrition = null;
	if (calories) {
		nutrition = {
			calories: parseInt(calories),
			protein_g: protein ? parseInt(protein) : null,
			carbs_g: carbs ? parseInt(carbs) : null,
			fat_g: fat ? parseInt(fat) : null
		};
	}

	const requestBody = {
		title,
		ingredients,
		steps,
		prep_time: prepTime ? parseInt(prepTime) : null,
		cook_time: cookTime ? parseInt(cookTime) : null,
		servings: servings ? parseInt(servings) : null,
		serving_size: servingSize || null,
		nutrition
	};

	const submitBtn = document.getElementById('submitBtn');
	submitBtn.disabled = true;
	submitBtn.textContent = 'Saving...';

	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch(`${API_URL}/api/recipes/${recipeId}/edit`, {
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify(requestBody)
		});

		if (response.status === 401) {
			localStorage.removeItem('auth_token');
			window.location.href = '/login';
			return;
		}

		const data = await response.json();

		if (data.status === 'success') {
			showMessage('Recipe updated successfully! Redirecting...', false);
			setTimeout(() => {
				window.location.href = `/recipe?id=${recipeId}`;
			}, 1500);
		} else {
			showMessage(data.detail || 'Failed to update recipe', true);
			submitBtn.disabled = false;
			submitBtn.textContent = 'Update Recipe';
		}
	} catch (error) {
		showMessage('Error updating recipe. Please try again.', true);
		submitBtn.disabled = false;
		submitBtn.textContent = 'Update Recipe';
	}
});
