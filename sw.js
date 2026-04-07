const CACHE_NAME = 'timber-layer-cache-v1.2'; // ★バージョン名（更新のたびに数字を変えると強力です）
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// インストール時：待機状態をスキップして即座に新しいサービスワーカーを起動
self.addEventListener('install', function(event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    })
  );
});

// アクティブ時：古いバージョンのキャッシュ（ゴミ）を完全に削除
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('古いキャッシュを削除しました:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(function() {
      return self.clients.claim(); // 即座にコントロールを奪う
    })
  );
});

// データの取得時：【ネットワーク・ファースト戦略】（電波があれば最新を、無ければキャッシュを）
self.addEventListener('fetch', function(event) {
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        // 通信成功時は、最新のデータをキャッシュにも上書き保存して返す
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        // オフライン（通信失敗）の時だけ、保存しておいたキャッシュを返す
        return caches.match(event.request);
      })
  );
});
