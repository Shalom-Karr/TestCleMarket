// sw.js - Focused on App Shell and Image Caching

const APP_CACHE_NAME = 'cleveland-marketplace-app-shell-v3'; // Increment to force update
const IMAGE_CACHE_NAME = 'cleveland-marketplace-images-v2'; // Separate cache for images

let SUPABASE_URL_FROM_CLIENT = ''; // Will be set by client script.js

const APP_SHELL_URLS_TO_CACHE = [
  '/',                   // Often resolves to index.html
  '/index.html',         // Or the specific name of your root HTML file
  '/style.css',
  '/script.js',
  '/manifest.json',      // Path relative to sw.js (root if sw.js is root)
  '/icons/icon-192x192.png', // Ensure these paths are correct
  '/icons/icon-512x512.png',
  '/offline.html'      // Your custom offline page
];

// Install: Cache app shell assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Attempting to install and cache app shell...');
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell:', APP_SHELL_URLS_TO_CACHE);
        // Add all app shell URLs. If any fails, install fails.
        return cache.addAll(APP_SHELL_URLS_TO_CACHE);
      })
      .then(() => {
        console.log('[Service Worker] App shell cached successfully. Skipping waiting.');
        return self.skipWaiting(); // Activate the new SW immediately
      })
      .catch(error => {
        console.error('[Service Worker] App shell caching failed:', error);
        // If caching fails, the SW won't install properly. Check paths in APP_SHELL_URLS_TO_CACHE.
      })
  );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  const cacheWhitelist = [APP_CACHE_NAME, IMAGE_CACHE_NAME]; // Add DATA_CACHE_NAME if you re-introduce it
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[Service Worker] Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[Service Worker] Claiming clients.');
      return self.clients.claim(); // Ensure new SW takes control of open pages
    })
  );
});

// Fetch: Handle requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Always go to network for non-GET requests and Supabase API/Function calls.
  if (event.request.method !== 'GET' ||
      (SUPABASE_URL_FROM_CLIENT && url.origin === SUPABASE_URL_FROM_CLIENT &&
        (url.pathname.startsWith('/rest/v1/') || url.pathname.startsWith('/functions/v1/'))
      )
     ) {
    event.respondWith(fetch(event.request).catch(err => {
        console.warn('[Service Worker] Network request failed for POST/API/Function:', event.request.url, err);
        // Return a generic network error response for these, as offline.html might not be appropriate.
        return new Response(JSON.stringify({ error: 'Network request failed.'}), {
            status: 503, // Service Unavailable
            headers: { 'Content-Type': 'application/json' }
        });
    }));
    return;
  }

  // 2. For Supabase Storage files (images/attachments): Cache first, then network
  if (SUPABASE_URL_FROM_CLIENT && url.origin === SUPABASE_URL_FROM_CLIENT && url.pathname.startsWith('/storage/v1/object/public/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          // console.log('[Service Worker] Serving image from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[Service Worker] Image not in cache, fetching from network:', event.request.url);
        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.ok) {
             await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          console.warn('[Service Worker] Storage fetch failed for image:', event.request.url, error);
          return new Response('', { status: 404, statusText: 'Image Not Found (Offline)'}); // Simple 404 if image fails
        }
      })
    );
    return;
  }

  // 3. For App Shell and other GET requests (HTML, CSS, JS, local assets):
  //    Cache first, then network. Fallback to offline.html for navigation requests.
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // console.log('[Service Worker] Serving app shell asset from cache:', event.request.url);
          return cachedResponse;
        }
        // console.log('[Service Worker] App shell asset not in cache, fetching from network:', event.request.url);
        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok && !event.request.url.startsWith('chrome-extension://')) {
              const responseToCache = networkResponse.clone();
              caches.open(APP_CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
            }
            return networkResponse;
          })
          .catch(() => { // Network failed for app shell asset
            if (event.request.mode === 'navigate') { // Only for page navigations
              console.warn('[Service Worker] App shell navigation failed, serving offline.html for:', event.request.url);
              return caches.match('/offline.html');
            }
            // For other assets (like a font from CDN that wasn't in APP_SHELL_URLS_TO_CACHE), just let it fail.
            return new Response('', { status: 404, statusText: 'Asset Not Found (Offline)' });
          });
      })
  );
});

// Message listener for SUPABASE_URL from client
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_SUPABASE_URL') {
    SUPABASE_URL_FROM_CLIENT = event.data.url;
    console.log('[Service Worker] Received SUPABASE_URL:', SUPABASE_URL_FROM_CLIENT);
  }
});

// Background Sync & Periodic Sync & Push are still complex to make fully operational
// For now, their listeners will just log that they were triggered.
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync event received, tag:', event.tag);
  if (event.tag === 'send-pending-data') {
    event.waitUntil(
      Promise.resolve().then(() => console.log('[Service Worker] Placeholder: Would process send-pending-data sync.'))
    );
  }
});

self.addEventListener('periodicsync', (event) => {
  console.log('[Service Worker] Periodic sync event received:', event.tag);
  if (event.tag === 'update-app-content') {
    event.waitUntil(
      Promise.resolve().then(() => console.log('[Service Worker] Placeholder: Would process update-app-content periodic sync.'))
    );
  }
});

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  const data = event.data ? event.data.json() : { title: 'New Notification', body: 'Something happened!' };
  const title = data.title || 'Cleveland Marketplace';
  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: data.badge || '/icons/icon-192x192.png', // Using 192 for badge as well
    data: {
        url: data.url || '/'
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.', event.notification);
  event.notification.close();
  const urlToOpen = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
