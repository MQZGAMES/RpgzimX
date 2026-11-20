// Service worker do RPGZIMX: deixa o jogo abrir rápido e funcionar sem internet depois da primeira visita.
// - Páginas (navegação): rede primeiro (pega a versão nova logo após publicar), cache se estiver offline.
// - Arquivos estáticos (JS/CSS/imagens/fontes com hash no nome): cache primeiro, atualizando em segundo plano.
// - Chamadas à API do GitHub (sincronização de saves) nunca passam pelo cache.
// o build substitui a versão e a lista abaixo por todos os arquivos publicados (ver vite.config.ts)
const CACHE = 'rpgzimx-dev';
const CACHE_PREFIX = 'rpgzimx-';
const PRECACHE = /*__PRECACHE__*/ [];
const SHELL = ['./', ...PRECACHE];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!url.href.startsWith(self.registration.scope)) return; // GitHub API, fontes externas: direto pela rede
  if (req.mode === 'navigate') {
    event.respondWith(
      // no-cache: sempre confere com o servidor (o GitHub Pages guarda a página por até 10 min)
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            event.waitUntil(caches.open(CACHE).then((c) => c.put('./index.html', copy)));
          }
          return res;
        })
        .catch(() => caches.open(CACHE).then(async (cache) => (await cache.match('./index.html', { ignoreVary: true })) || (await cache.match('./', { ignoreVary: true })) || Response.error())),
    );
    return;
  }
  event.respondWith(
    // ignoreVary: scripts de módulo mandam "Origin" e o servidor pode responder com "Vary: Origin"
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreVary: true });
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            event.waitUntil(cache.put(req, copy));
          }
          return res;
        })
        .catch(() => Response.error());
    }),
  );
});
