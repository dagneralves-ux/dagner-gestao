/* Service worker — DS Gestão. Dados ficam no Supabase (nunca em cache aqui). */
const VERSION = 'ds-v104-limpeza-20261109';
const CORE = ['./', 'index.html', 'manifest.json', 'v100.css', 'v102.css', 'v100.js', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/logo.png', 'icons/logo.svg', 'icons/logo-branco.svg', 'icons/favicon-32.png', 'icons/favicon-64.png', 'icons/apple-touch-icon.png', 'icons/maskable-512.png'];

/* bibliotecas locais (opcionais: se o arquivo não existir, o app usa o CDN) */
const LIBS = ['libs/supabase.min.js', 'libs/jspdf.umd.min.js', 'libs/jspdf.plugin.autotable.min.js', 'libs/tabler/tabler-icons.min.css'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE).then(() => Promise.all(LIBS.map(u => c.add(u).catch(() => {}))))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co') || url.hostname.endsWith('supabase.in')) return; // dados: sempre rede
  const sameOrigin = url.origin === self.location.origin;
  const cdn = /(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|fonts\.googleapis\.com|fonts\.gstatic\.com)$/.test(url.hostname);
  if (sameOrigin) {
    // rede primeiro (pega versão nova), cache como reserva
    e.respondWith(
      fetch(req).then(res => {
        if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res;
      }).catch(() => caches.match(req, {ignoreSearch:true}).then(r => r || caches.match('index.html')))
    );
  } else if (cdn) {
    // bibliotecas e fontes: abre do cache e atualiza por trás
    e.respondWith(
      caches.match(req).then(hit => {
        const net = fetch(req).then(res => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
