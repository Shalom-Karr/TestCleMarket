// sw.js - Modern, SPA-First Service Worker for Cleveland Marketplace

// --- CONFIGURATION ---

// Increment this version number every time you update the service worker file.
// This is crucial to force browsers to update their cached version.
const APP_CACHE_VERSION = 'v5';
const APP_CACHE_NAME = `cleveland-marketplace-app-shell-${APP_CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `cleveland-marketplace-images-${APP_CACHE_VERSION}`;

// This will be populated by a message from the client script.
let SUPABASE_URL_FROM_CLIENT = '';

// A comprehensive list of all files that make up the "app shell".
// These are cached on install and make the core app work offline.
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/login.html',
  '/signup.html',
  '/messages.html',
  '/admin.html',
  '/terms.html',
  '/privacy.html',
  '/logo.html',
  '/offline.html',
  '/style.css',
  '/script.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];


// --- SERVICE WORKER LIFECYCLE ---

// 1. INSTALL: Fired when the service worker is first installed.
self.addEventListener('install', (event) => {
  console.log(`[SW] Installing v${APP_CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(APP_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching App Shell...');
        return cache.addAll(APP_SHELL_URLS);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        console.log('[SW] Install successful. Activating immediately.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] App Shell caching failed during install:', error);
      })
  );
});

// 2. ACTIVATE: Fired after install. Used to clean up old caches.
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activating v${APP_CACHE_VERSION}...`);
  const cacheWhitelist = [APP_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      console.log('[SW] Claiming clients.');
      return self.clients.claim();
    })
  );
});


// --- FETCH EVENT HANDLER (THE BRAIN) ---

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // --- STRATEGY 1: Ignore non-GET requests and Supabase API calls ---
  // These should always go directly to the network.
  if (event.request.method !== 'GET' ||
      (SUPABASE_URL_FROM_CLIENT && url.origin === new URL(SUPABASE_URL_FROM_CLIENT).origin &&
        (url.pathname.startsWith('/rest/') || url.pathname.startsWith('/functions/'))
      )
     ) {
    return; // Let the browser handle it.
  }

  // --- STRATEGY 2: Cache First for Images & Attachments ---
  // For Supabase storage items, it's best to serve from cache if available for performance.
  if (SUPABASE_URL_FROM_CLIENT && url.origin === new URL(SUPABASE_URL_FROM_CLIENT).origin && url.pathname.startsWith('/storage/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(event.request);
        if (cachedResponse) {
          return cachedResponse; // Serve from cache
        }
        // Not in cache, fetch from network, then cache it for next time
        const networkResponse = await fetch(event.request);
        if (networkResponse && networkResponse.ok) {
          await cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      })
    );
    return;
  }

  // --- STRATEGY 3: Network First, then Cache for App Shell Assets ---
  // For core files like CSS and JS, try the network first to get the latest version.
  // If the network fails, fall back to the cached version.
  if (APP_SHELL_URLS.some(path => url.pathname.endsWith(path))) {
    event.respondWith(
      caches.open(APP_CACHE_NAME).then(async (cache) => {
        try {
          const networkResponse = await fetch(event.request);
          // If successful, update the cache with the new version
          if (networkResponse.ok) {
            await cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          // Network failed, serve the asset from the cache instead
          console.warn(`[SW] Network failed for ${url.pathname}. Serving from cache.`);
          return await cache.match(event.request);
        }
      })
    );
    return;
  }

  // --- STRATEGY 4: App Shell for Navigation ---
  // This is the most important part for SPAs.
  // If the user is navigating to a new page (e.g., /messages), serve the main index.html.
  // The client-side JavaScript will then read the URL and display the correct view.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        // As a last resort, if index.html isn't even cached, try to fetch it.
        return fetch('/index.html').catch(() => caches.match('/offline.html'));
      })
    );
    return;
  }

  // For any other requests, just let the browser handle them.
});


// --- OTHER EVENTS ---

// Listen for messages from the client, specifically to get the Supabase URL.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SET_SUPABASE_URL') {
    SUPABASE_URL_FROM_CLIENT = event.data.url;
    console.log('[SW] Received and set Supabase URL:', SUPABASE_URL_FROM_CLIENT);
  }
});

// Push notification received
self.addEventListener('push', (event) => {
  console.log('[SW] Push Received.');
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Cleveland Marketplace';
  const options = {
    body: data.body || 'You have a new update.',
    icon: data.icon || '/icons/icon-192x192.png',
    badge: '/icons/icon-192x192.png',
    data: { url: data.url || '/' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification clicked
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked.');
  event.notification.close();
  const urlToOpen = event.notification.data.url;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window for the app is already open, focus it.
      for (const client of clientList) {
        if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Placeholder for Background Sync
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync event received, tag:', event.tag);
});