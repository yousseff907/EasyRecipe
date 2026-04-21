document.addEventListener('DOMContentLoaded', () => {
	fetch('/api/public/recipes')
		.then(r => r.json())
		.then(data => {
			document.getElementById('loading').classList.add('hidden');

			if (!data.recipes || data.recipes.length === 0) {
				document.getElementById('emptyState').classList.remove('hidden');
				return;
			}

			const grid = document.getElementById('recipesGrid');
			grid.classList.remove('hidden');

			data.recipes.forEach(recipe => {
				const card = document.createElement('a');
				card.href = `/r/${recipe.id}`;
				card.className = 'block bg-white rounded-xl shadow-md hover:shadow-xl transition overflow-hidden flex flex-col';

				card.innerHTML = `
					<div class="p-6 flex-1">
						<h2 class="text-xl font-bold text-gray-800 mb-2 line-clamp-2 break-words">${recipe.title || 'Untitled Recipe'}</h2>
						${recipe.owner_username ? `<p class="text-xs text-pink-dark mb-2 truncate">by @${recipe.owner_username}</p>` : ''}
						<p class="text-xs text-gray-500">
							${recipe.created_at ? new Date(recipe.created_at + 'Z').toLocaleDateString() : ''}
						</p>
					</div>
					<div class="bg-pink-light px-6 py-3 text-pink-dark font-semibold text-sm">
						View Recipe →
					</div>
				`;

				grid.appendChild(card);
			});
		})
		.catch(() => {
			document.getElementById('loading').classList.add('hidden');
			document.getElementById('emptyState').classList.remove('hidden');
		});
});
