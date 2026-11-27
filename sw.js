/* =========================================================
   sw.js — 雲端更新策略（v15）
   - HTML / JS / CSS / JSON：network-first（永遠先拿最新，離線才用快取）
   - 圖片 / 字型：stale-while-revalidate（快，背景更新）
   - 只換快取，永不碰 localStorage 存檔
   ========================================================= */
'use strict';

const CACHE = 'abyss-echo-v15';

const FILES = [
  './',
  './index.html',
  './manifest.webmanifest',
  './style.css',
  './version.json',
  './content.json',
  './changelog.json',
  './js/data.js',
  './js/lang-en.js',
  './js/i18n.js',
  './js/content.js',
  './js/ads.js',
  './js/version.js',
  './js/news.js',
  './js/unlock.js',
  './js/owner.js',
  './js/updater.js',
  './js/art.js',
  './js/audio.js',
  './js/game.js',
  './js/pwa.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(FILES).catch(() => null))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

/* 程式碼類：一定要新 */
const CODE_EXT = ['.js', '.css', '.json', '.html', '.webmanifest', '.mp4'];

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  const path = url.pathname;
  const isCode = req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    CODE_EXT.some((ext) => path.endsWith(ext));

  /* 程式碼與頁面：先連網（no-store），失敗才回快取 */
  if (isCode) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  /* 圖片等：先給快取，同時背景更新 */
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
