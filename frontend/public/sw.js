// Hippo Campus Service Worker
const CACHE_NAME = 'hippo-campus-v2';
const SHARE_TARGET_CACHE = 'share-target-cache';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // Take control of all pages immediately
  self.clients.claim();
});

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Handle Share Target POST requests
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(handleShareTarget(event.request));
    return;
  }

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API requests (don't cache)
  if (event.request.url.includes('/api/') || event.request.url.includes('localhost:8000')) {
    return;
  }

  // Skip photo requests - always fetch fresh from CDN
  if (event.request.url.includes('/photos/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone and cache successful responses
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // For navigation requests, return cached index.html
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// Handle Share Target - cache files and redirect to handler page
async function handleShareTarget(request) {
  console.log('[SW] Handling share target request');
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('photos');
    
    if (files && files.length > 0) {
      // Cache the shared files temporarily
      const cache = await caches.open(SHARE_TARGET_CACHE);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file instanceof File) {
          // Create a unique URL for this file
          const fileUrl = `/shared-file-${Date.now()}-${i}-${file.name}`;
          const response = new Response(file, {
            headers: {
              'Content-Type': file.type,
              'X-File-Name': file.name,
            },
          });
          await cache.put(fileUrl, response);
          console.log('[SW] Cached shared file:', fileUrl);
        }
      }
    }
    
    // Redirect to the share target handler page
    return Response.redirect('/share-target', 303);
  } catch (error) {
    console.error('[SW] Share target error:', error);
    return Response.redirect('/share-target?error=true', 303);
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  console.log('[SW] Push received:', event);

  let data = { title: 'Hippo Campus', body: 'You have new memories!' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/flashbacks',
    },
    actions: [
      { action: 'view', title: 'View Memories' },
      { action: 'close', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'close') return;

  const url = event.notification.data?.url || '/flashbacks';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there's already a window open
      for (const client of windowClients) {
        if (client.url.includes(self.registration.scope) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});

