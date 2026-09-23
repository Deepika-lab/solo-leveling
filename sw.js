/**
 * sw.js - Service Worker for 100% Offline PWA Functionality
 */

const CACHE_NAME = 'solo-leveling-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './css/system-theme.css',
  './css/components.css',
  './js/models.js',
  './js/audio.js',
  './js/storage.js',
  './js/scene3d.js',
  './js/quests.js',
  './js/dungeons.js',
  './js/shadows.js',
  './js/shop.js',
  './js/app.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) return caches.delete(k);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      return res || fetch(e.request).catch(() => caches.match('./index.html'));
    })
  );
});
