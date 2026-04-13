const CACHE_NAME = 'ztmy-gallery-v1';
const ASSETS = [
  'index_new.html',
  'bootstrap.min.css',
  'photoswipe.min.css',
  'photoswipe-dynamic-caption-plugin.css',
  'fontawesome-free-7.2.0.all.min.css',
  'bootstrap.bundle.min.js',
  'photoswipe-lightbox.umd.min.js',
  'photoswipe.umd.min.js',
  'photoswipe-dynamic-caption-plugin.umd.min.js',
  'data_new.js',
  'mv_new.js'
];

// 安裝並快取靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// 啟用後清理舊版本快取
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      }));
    })
  );
});

// 攔截請求
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});