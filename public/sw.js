const CACHE_VERSION = 'balahza-shell-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((oldKey) => caches.delete(oldKey))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function shouldBypassCache(request, url) {
  // Never intercept non-GET requests (uploads, mutations, auth calls)
  if (request.method !== 'GET') return true;

  // Never intercept cross-origin requests (Supabase, ImageKit, Google Maps, Fonts, etc.)
  if (url.origin !== self.location.origin) return true;

  // Never intercept backend API routes, Digital Asset Links, or direct APK binary downloads
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/.well-known/') ||
    url.pathname.endsWith('.apk')
  ) {
    return true;
  }

  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (shouldBypassCache(request, url)) {
    return;
  }

  // Network-first for HTML page navigations with offline shell fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || caches.match('/');
        })
    );
    return;
  }

  // Stale-while-revalidate for same-origin static assets (JS, CSS, manifest, icons)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const networkFetch = fetch(request)
        .then((response) => {
          if (response && response.ok && response.type === 'basic') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cachedResponse);

      return cachedResponse || networkFetch;
    })
  );
});
