// Check authentication
window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
});

// Handle form submission
document.getElementById('recipeForm').addEventListener('submit', async (e) => {
	e.preventDefault();

	const title = document.getElementById('title').value.trim();
	const ingredientsText = document.getElementById('ingredients').value;
	const stepsText = document.getElementById('steps').value;
	const prepTime = document.getElementById('prepTime').value;
	const cookTime = document.getElementById('cookTime').value;
	const servings = document.getElementById('servings').value;

	// Parse ingredients and steps
	const ingredients = ingredientsText
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	const steps = stepsText
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	// Validate
	if (!title) {
		showMessage('Please enter a recipe title', true);
		return;
	}

	if (ingredients.length === 0) {
		showMessage('Please enter at least one ingredient', true);
		return;
	}

	if (steps.length === 0) {
		showMessage('Please enter at least one step', true);
		return;
	}

	if (ingredients.length > 100) {
		showMessage('Maximum 100 ingredients allowed', true);
		return;
	}

	if (steps.length > 50) {
		showMessage('Maximum 50 steps allowed', true);
		return;
	}

	// Build nutrition object if provided
	let nutrition = null;
	const calories = document.getElementById('calories').value;
	const protein = document.getElementById('protein').value;
	const carbs = document.getElementById('carbs').value;
	const fat = document.getElementById('fat').value;

	if (calories) {
		nutrition = {
			calories: parseInt(calories),
			protein_g: protein ? parseInt(protein) : null,
			carbs_g: carbs ? parseInt(carbs) : null,
			fat_g: fat ? parseInt(fat) : null
		};
	}

	// Build request body
	const requestBody = {
		title: title,
		ingredients: ingredients,
		steps: steps,
		prep_time: prepTime ? parseInt(prepTime) : null,
		cook_time: cookTime ? parseInt(cookTime) : null,
		servings: servings ? parseInt(servings) : null,
		nutrition: nutrition
	};

	// Disable button
	const submitBtn = document.getElementById('submitBtn');
	submitBtn.disabled = true;
	submitBtn.textContent = 'Saving...';

	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch(`${API_URL}/api/make_your_own`, {
			method: 'POST',
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
			showMessage('Recipe saved successfully! Redirecting...', false);
			setTimeout(() => {
				window.location.href = '/recipes';
			}, 1500);
		} else {
			showMessage(data.detail || 'Failed to save recipe', true);
			submitBtn.disabled = false;
			submitBtn.textContent = 'Save Recipe';
		}
	} catch (error) {
		showMessage('Error saving recipe. Please try again.', true);
		submitBtn.disabled = false;
		submitBtn.textContent = 'Save Recipe';
	}
});