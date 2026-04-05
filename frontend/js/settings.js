// Fetch and display current username
async function loadCurrentUsername() {
	const token = localStorage.getItem('token');
	if (!token) {
		window.location.href = '/';
		return;
	}

	try {
		const response = await fetch('/api/user/me', {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (response.ok) {
			const data = await response.json();
			document.getElementById('currentUsername').textContent = data.username || data.email;
		} else {
			document.getElementById('currentUsername').textContent = 'Unknown';
		}
	} catch (error) {
		console.error('Error loading username:', error);
		document.getElementById('currentUsername').textContent = 'Error loading';
	}
}

// Call on page load
window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
	loadCurrentUsername();
});

// Check authentication
window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
});

// Function: Change Username
async function changeUsername() {
	const newUsername = document.getElementById('newUsername').value.trim();

	if (!newUsername) {
		showMessage('Please enter a new username', true);
		return;
	}

	if (newUsername.length < 3) {
		showMessage('Username must be at least 3 characters', true);
		return;
	}

	if (newUsername.length > 50) {
		showMessage('Username must be less than 50 characters', true);
		return;
	}

	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch(`${API_URL}/api/change_username`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ string: newUsername })
		});

		if (response.status === 401) {
			localStorage.removeItem('auth_token');
			window.location.href = '/login';
			return;
		}

		const data = await response.json();

		if (response.ok) {
			showMessage('Username updated successfully!', false);
			document.getElementById('newUsername').value = '';
		} else {
			showMessage(data.detail || 'Failed to update username', true);
		}
	} catch (error) {
		showMessage('Error updating username. Please try again.', true);
	}
}

// Function: Confirm Delete Account
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

	// Show confirmation dialog
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

// Function: Delete Account
async function deleteAccount(feedback) {
	try {
		const token = localStorage.getItem('auth_token');
		const response = await fetch(`${API_URL}/api/delete_account`, {
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
			window.location.href = '/login';
		} else {
			const data = await response.json();
			showMessage(data.detail || 'Failed to delete account', true);
		}
	} catch (error) {
		showMessage('Error deleting account. Please try again.', true);
	}
}
