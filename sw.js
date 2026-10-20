/* Service worker — offline support for the Illustrator course app */
const VERSION = 'ai-course-v5';
const CORE = ['./', 'index.html', 'exam.html', 'manifest.webmanifest', 'icon.svg', 'icon-maskable.svg'];
const CDN = [
  'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.min.js',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&family=Playfair+Display:ital,wght@0,700;1,700&family=JetBrains+Mono:wght@400;600&family=Noto+Sans+Myanmar:wght@400;700&family=Noto+Sans+Arabic:wght@400;700&family=Noto+Sans+Hanifi+Rohingya&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await Promise.allSettled(CORE.map((u) => cache.add(u)));
    await Promise.allSettled(CDN.map(async (u) => {
      const res = await fetch(new Request(u, { mode: 'no-cors' }));
      await cache.put(u, res);
    }));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req);
    if (res && res.ok) cache.put('index.html', res.clone());
    return res;
  } catch (err) {
    return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
  }
}

async function staleWhileRevalidate(req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req);
  const network = fetch(req).then((res) => {
    if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;
  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req));
    return;
  }
  event.respondWith(staleWhileRevalidate(req));
});
