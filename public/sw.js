const CACHE_NAME = 'aminna-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Instalação do Service Worker e cache inicial de assets estáticos básicos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usamos cache.addAll de forma tolerante para evitar falha na instalação se algum arquivo estiver indisponível
      return cache.addAll(ASSETS_TO_CACHE).catch(err => {
        console.warn('Erro ao cachear assets iniciais durante a instalacao:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Limpando cache antigo do Service Worker:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estratégia de Fetch: Network-First (Rede Primeiro) caindo para Cache se offline
// Isso evita que dados dinâmicos ou novas versões fiquem obsoletas em cache eterno
self.addEventListener('fetch', (event) => {
  // Apenas lidar com requisições GET para recursos da própria origem
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  
  // Ignorar chamadas de API externas (ex: Supabase, APIs de NFSe)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Ignorar requisições do Live Reload do Vite ou HMR em desenvolvimento
  if (url.pathname.includes('@vite') || url.pathname.includes('node_modules') || url.pathname.includes('.tsx') || url.pathname.includes('.ts')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, guardamos uma cópia no cache e retornamos
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Se falhar a rede (offline), busca no cache
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Caso não encontre nada e seja navegação de página, retorna a raiz
          if (event.request.mode === 'navigate') {
            return caches.match('/');
          }
        });
      })
  );
});
