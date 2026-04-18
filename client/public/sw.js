const CACHE_NAME = 'notepad-shell-v1';
const SHELL_URLS = ['/', '/dashboard', '/auth'];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            cache.addAll(SHELL_URLS).catch(() => {})
        )
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;

    const url = new URL(req.url);

    // Never cache API calls or socket traffic — always hit the network.
    if (
        url.origin !== self.location.origin ||
        url.pathname.startsWith('/api/') ||
        url.pathname.includes('/socket.io/')
    ) {
        return;
    }

    // Navigations: network-first, fall back to cached shell when offline.
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                    return res;
                })
                .catch(() =>
                    caches.match(req).then((hit) => hit || caches.match('/'))
                )
        );
        return;
    }

    // Static assets: stale-while-revalidate.
    event.respondWith(
        caches.match(req).then((cached) => {
            const fetchPromise = fetch(req)
                .then((res) => {
                    if (res && res.status === 200) {
                        const copy = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
                    }
                    return res;
                })
                .catch(() => cached);
            return cached || fetchPromise;
        })
    );
});
