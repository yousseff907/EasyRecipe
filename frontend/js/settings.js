// Fetch and display current username
async function loadCurrentUsername() {
	const token = localStorage.getItem('token');
	if (!token) return;

	try {
		const response = await fetch('/api/user/me', {
			headers: {
				'Authorization': `Bearer ${token}`
			}
		});

		if (response.ok) {
			const data = await response.json();
			const usernameSpan = document.getElementById('currentUsername');
			if (usernameSpan) {
				usernameSpan.textContent = data.username || data.email;
			}
		}
	} catch (error) {
		console.error('Error loading username:', error);
	}
}

// Function: Change Username

// Function: Change Username
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
		const token = localStorage.getItem('token');  // FIXED: was 'auth_token'
		const response = await fetch('/api/change_username', {  // FIXED: removed API_URL
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ string: newUsername })
		});

		if (response.status === 401) {
			localStorage.removeItem('token');
			window.location.href = '/';
			return;
		}

		const data = await response.json();

		if (response.ok) {
			showMessage('Username updated successfully!', false);
			document.getElementById('newUsername').value = '';
			// Reload username display
			loadCurrentUsername();
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
		const token = localStorage.getItem('token');  // FIXED: was 'auth_token'
		const response = await fetch('/api/delete_account', {  // FIXED: removed API_URL
			method: 'DELETE',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${token}`
			},
			body: JSON.stringify({ feedback: feedback })
		});

		if (response.ok) {
			localStorage.removeItem('token');
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

// Show message helper
function showMessage(text, isError) {
	const messageDiv = document.getElementById('message');
	messageDiv.textContent = text;
	messageDiv.className = `mt-6 p-4 rounded-lg ${isError ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`;
	messageDiv.classList.remove('hidden');

	setTimeout(() => {
		messageDiv.classList.add('hidden');
	}, 5000);
}

// Initialize on page load - SINGLE listener
window.addEventListener('DOMContentLoaded', () => {
	checkAuth();
	loadCurrentUsername();
});