window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
});

async function generateRecipe() {
	const ingredientsText = document.getElementById('ingredients').value;
	const instructions = document.getElementById('instructions').value.trim();

	const ingredients = ingredientsText
		.split('\n')
		.map(line => line.trim())
		.filter(line => line.length > 0);

	if (ingredients.length === 0) {
		showMessage('Please enter at least one ingredient', true);
		return;
	}

	if (ingredients.length > 100) {
		showMessage('Maximum 100 ingredients allowed', true);
		return;
	}

	document.getElementById('inputForm').classList.add('hidden');
	document.getElementById('loading').classList.remove('hidden');

	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch(`${API_URL}/api/make_your_own_with_ai`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ ingredients, instructions })
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