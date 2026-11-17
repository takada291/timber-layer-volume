const CACHE_NAME = 'timber-layer-cache-v2.3.0'; // 
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './sw.js',
  './icon-192.png',
  './icon-512.png',
  './roboflow.js',
  './model.json',
  './group1-shard1of3.bin',
  './group1-shard2of3.bin',
  './group1-shard3of3.bin'
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

// データの取得時：モデルデータはキャッシュ優先、アプリ本体はネットワーク・ファースト
self.addEventListener('fetch', function(event) {
  const reqUrl = event.request.url;

  // 1. 認識モデル関連ファイル（roboflow.js / model.json / .bin）はキャッシュ優先で即座に返す
  const isModelAsset =
    reqUrl.endsWith('roboflow.js') ||
    reqUrl.endsWith('model.json') ||
    reqUrl.includes('my-first-project-bjosg/40') ||
    /group1-shard\d+of\d+\.bin/.test(reqUrl);

  if (isModelAsset) {
    event.respondWith(
      caches.match(event.request, { ignoreSearch: true }).then(function(cachedResponse) {
        if (cachedResponse) {
          return cachedResponse;
        }
        if (reqUrl.includes('my-first-project-bjosg/40')) {
          return caches.match('./model.json');
        }
        return fetch(event.request);
      })
    );
    return;
  }

  // 2. アプリ本体：【ネットワーク・ファースト戦略】（電波があれば最新を、無ければキャッシュを）
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
        return caches.match(event.request, { ignoreSearch: true });
      })
  );
});
