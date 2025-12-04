// Service Worker for Aggressive Image Preloading and Caching (Unsplash Technique)
// This service worker preloads images before they're needed to prevent flashing

const CACHE_NAME = 'photo-app-images-v1';
const PRELOAD_CACHE = 'photo-app-preload-v1';

// Install event - set up cache
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== PRELOAD_CACHE)
          .map((name) => caches.delete(name))
      );
    })
  );
  return self.clients.claim(); // Take control of all pages immediately
});

// Fetch event - aggressive caching strategy for images
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Only handle image requests
  if (
    url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif|svg)$/i) ||
    event.request.headers.get('accept')?.includes('image')
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        // If cached, return immediately (fastest)
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise, fetch and cache
        return fetch(event.request)
          .then((response) => {
            // Don't cache if not successful
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response (stream can only be read once)
            const responseToCache = response.clone();

            // Cache the image
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          })
          .catch(() => {
            // If fetch fails, return a placeholder or error
            // For now, just let it fail naturally
            return new Response('Image fetch failed', { status: 404 });
          });
      })
    );
  }
  
  // For non-image requests, use network-first strategy
  // (don't intercept, let browser handle normally)
});

// Message handler for preload requests from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PRELOAD_IMAGE') {
    const { url } = event.data;
    
    // Preload image in background
    fetch(url)
      .then((response) => {
        if (response.ok) {
          return caches.open(PRELOAD_CACHE).then((cache) => {
            return cache.put(url, response);
          });
        }
      })
      .then(() => {
        // Notify main thread that preload is complete
        event.ports[0]?.postMessage({ type: 'PRELOAD_COMPLETE', url });
      })
      .catch((error) => {
        console.error('[SW] Preload failed:', error);
        event.ports[0]?.postMessage({ type: 'PRELOAD_FAILED', url });
      });
  }
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

