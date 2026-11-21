const CACHE_NAME = 'easyrecipe-v1';
const STATIC_ASSETS = [
	'/',
	'/home',
	'/recipes',
	'/favorites',
	'/recipe',
	'/search',
	'/settings',
	'/extract',
	'/make-your-own',
	'/ai-recipe',
	'/about',
	'/privacy',
	'/js/utils.js',
	'/js/home.js',
	'/js/recipes.js',
	'/js/recipe.js',
	'/js/search.js',
	'/js/settings.js',
	'/js/extract.js',
	'/js/make-your-own.js',
	'/js/ai-recipe.js',
	'/android-chrome-192x192.png',
	'/android-chrome-512x512.png',
	'/apple-touch-icon.png',
	'/favicon-32x32.png',
	'/favicon-16x16.png',
	'/site.webmanifest',
	'/contact',
	'/terms',
	'/edit',
	'/user/',
	'/js/edit.js',
	'/js/favorites.js',
	'/js/profile.js',
	'/js/login.js',
	'/favicon.ico',
	'/output.css'
];

self.addEventListener('install', event => {
	event.waitUntil(
		caches.open(CACHE_NAME).then(cache => {
			return cache.addAll(STATIC_ASSETS);
		})
	);
	self.skipWaiting();
});

self.addEventListener('activate', event => {
	event.waitUntil(
		caches.keys().then(keys => {
			return Promise.all(
				keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
			);
		})
	);
	self.clients.claim();
});

self.addEventListener('fetch', event => {
	const url = new URL(event.request.url);

	if (event.request.method !== 'GET' || url.origin !== location.origin) {
		return;
	}

	if (url.pathname.startsWith('/api/')) {
		event.respondWith(
			fetch(event.request)
				.then(response => {
					const clone = response.clone();
					caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
					return response;
				})
				.catch(() => caches.match(event.request))
		);
		return;
	}

	event.respondWith(
		caches.match(event.request).then(cached => {
			return cached || fetch(event.request).then(response => {
				const clone = response.clone();
				caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
				return response;
			});
		})
	);
});

self.addEventListener('message', event => {
	if (event.data.type === 'CACHE_RECIPES') {
		const { recipes, token } = event.data;
		caches.open(CACHE_NAME).then(cache => {
			recipes.forEach(recipe => {
				const url = `/api/recipes/${recipe.id}`;
				fetch(url, {
					headers: { 'Authorization': `Bearer ${token}` }
				}).then(response => {
					if (response.ok) cache.put(url, response);
				}).catch(() => { });
			});
		});
	}
});
