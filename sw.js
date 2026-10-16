// Shadow Runner Service Worker — basic offline caching
const CACHE = "shadow-runner-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.json",
  "./vendor/phaser.min.js",
  "./src/main.js",
  "./src/scenes/BootScene.js",
  "./src/scenes/MenuScene.js",
  "./src/scenes/GameScene.js",
  "./src/scenes/UIScene.js",
  "./src/systems/Controls.js",
  "./src/systems/Audio.js",
  "./src/systems/Storage.js",
  "./src/entities/Hero.js",
  "./src/entities/Enemy.js",
  "./src/entities/Coin.js",
  "./src/entities/Checkpoint.js",
  "./src/entities/Exit.js",
  "./src/levels/levels.js",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const network = fetch(e.request)
        .then((resp) => {
          if (resp && resp.status === 200 && resp.type === "basic") {
            const respClone = resp.clone();
            caches.open(CACHE).then((c) => c.put(e.request, respClone));
          }
          return resp;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
