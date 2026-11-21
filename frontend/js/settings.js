async function loadCurrentUsername() {
	const token = localStorage.getItem('auth_token');
	if (!token) return;

	try {
		const response = await fetch('/api/user/me', {
			headers: { 'Authorization': `Bearer ${token}` }
		});

		if (response.ok) {
			const data = await response.json();
			document.getElementById('currentUsername').textContent = data.username || data.email;
			document.getElementById('currentBio').textContent = data.bio || 'No bio yet.';
			document.getElementById('publicRecipeCount').textContent = `${data.public_recipe_count} public recipe(s)`;
			if (data.bio) {
				document.getElementById('newBio').value = data.bio;
			}
		}
	} catch (error) {
		console.error('Error loading user info:', error);
	}
}

async function changeBio() {
	const newBio = document.getElementById('newBio').value.trim();

	if (newBio.length > 200) {
		showMessage('Bio must be less than 200 characters', true);
		return;
	}

	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch('/api/change_bio', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ string: newBio })
		});

		const data = await response.json();

		if (response.ok) {
			showMessage('Bio updated successfully!', false);
			document.getElementById('currentBio').textContent = newBio;
			document.getElementById('newBio').value = '';
			document.getElementById('bioCount').textContent = '0/200';
		} else {
			showMessage(data.detail || 'Failed to update bio', true);
		}
	} catch (error) {
		showMessage('Error updating bio. Please try again.', true);
	}
}

async function changeUsername() {
	const newUsername = document.getElementById('newUsername').value.trim();

	if (!newUsername) {
		showMessage('Please enter a new username', true);
		return;
	}

	if (newUsername.length > 30) {
		showMessage('Username must be less than 30 characters', true);
		return;
	}

	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch('/api/change_username', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ string: newUsername })
		});

		if (response.status === 401) {
			localStorage.removeItem('auth_token');
			window.location.href = '/';
			return;
		}

		const data = await response.json();

		if (response.ok) {
			showMessage('Username updated successfully!', false);
			document.getElementById('newUsername').value = '';
			loadCurrentUsername();
		} else {
			showMessage(data.detail || 'Failed to update username', true);
		}
	} catch (error) {
		showMessage('Error updating username. Please try again.', true);
	}
}

function confirmDelete() {
	const reason = document.getElementById('deleteReason').value.trim();

	if (!reason) {
		showMessage('Please tell us why you\'re leaving', true);
		return;
	}

	if (reason.length < 10) {
		showMessage('Please provide at least 10 characters of feedback', true);
		return;
	}

	const confirmed = confirm(
		'ARE YOU ABSOLUTELY SURE?\n\n' +
		'This will permanently delete:\n' +
		'• Your account\n' +
		'• All your saved recipes\n' +
		'• All your data\n\n' +
		'This action CANNOT be undone!\n\n' +
		'Click OK to delete your account forever.'
	);

	if (confirmed) {
		deleteAccount(reason);
	}
}

async function deleteAccount(feedback) {
	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch('/api/delete_account', {
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ feedback: feedback })
		});

		if (response.ok) {
			localStorage.removeItem('auth_token');
			alert('Your account has been deleted. We\'re sorry to see you go!');
			window.location.href = '/';
		} else {
			const data = await response.json();
			showMessage(data.detail || 'Failed to delete account', true);
		}
	} catch (error) {
		showMessage('Error deleting account. Please try again.', true);
	}
}

function showMessage(text, isError) {
	const messageDiv = document.getElementById('message');
	messageDiv.textContent = text;
	messageDiv.className = `mt-6 p-4 rounded-lg ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
	messageDiv.classList.remove('hidden');

	setTimeout(() => {
		messageDiv.classList.add('hidden');
	}, 5000);
}

window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
	loadCurrentUsername();
});