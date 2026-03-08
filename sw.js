// VigiloPro — Service Worker PWA
// Cache stratégique : app shell + ressources statiques

const CACHE_NAME = 'vigilopro-v1';
const CACHE_URLS = [
  '/vigilopro/',
  '/vigilopro/index.html',
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Share+Tech+Mono&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
];

// Installation — mise en cache des ressources essentielles
self.addEventListener('install', event => {
  console.log('[SW] Installation VigiloPro');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(CACHE_URLS).catch(e => {
        console.warn('[SW] Certaines ressources non cachées:', e);
      });
    })
  );
  self.skipWaiting();
});

// Activation — nettoyage des anciens caches
self.addEventListener('activate', event => {
  console.log('[SW] Activation VigiloPro');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch — stratégie Cache First pour l'app, Network First pour Firebase
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Laisser passer les requêtes Firebase sans interception
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('firestore') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('anthropic')
  ) {
    return; // Pas d'interception — Firebase gère son propre offline
  }

  // Pour tout le reste : Cache First avec fallback réseau
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Mettre en cache les nouvelles ressources statiques
        if (
          response.ok &&
          event.request.method === 'GET' &&
          !url.hostname.includes('fonts.gstatic')
        ) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Fallback hors ligne : retourner l'app principale
        if (event.request.destination === 'document') {
          return caches.match('/vigilopro/index.html');
        }
      });
    })
  );
});

// Message depuis l'app — forcer la mise à jour
self.addEventListener('message', event => {
  if (event.data === 'skipWaiting') self.skipWaiting();
});
