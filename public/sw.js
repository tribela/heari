const GAME_API = "/api/game";
const CACHE_NAME = "heari-api-v1";

// 서버가 내려준 Date + max-age(자정 만료)로 fresh 판단 — 본문 파싱 없음
function isFresh(res) {
  const date = Date.parse(res.headers.get("date") || "");
  const cc = res.headers.get("cache-control") || "";
  const m = /max-age=(\d+)/.exec(cc);
  if (!date || !m) return false;
  return Date.now() < date + Number(m[1]) * 1000;
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

// /api/game stale-while-revalidate: fresh면 캐시 즉시 반환, 만료면 stale 반환 후 백그라운드 재검증
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin || url.pathname !== GAME_API) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cacheKey = event.request.url;
      const cached = await cache.match(cacheKey);

      if (!cached) {
        const res = await fetch(event.request);
        if (res.ok) cache.put(cacheKey, res.clone());
        return res;
      }

      if (isFresh(cached)) return cached;

      event.waitUntil(
        (async () => {
          try {
            const freshRes = await fetch(event.request);
            if (!freshRes.ok) return;
            await cache.put(cacheKey, freshRes.clone());
            const freshData = await freshRes.json();
            const clients = await self.clients.matchAll({ type: "window" });
            for (const client of clients) {
              client.postMessage({ type: "new-game", date: freshData.date, chosung: freshData.chosung });
            }
          } catch { /* 네트워크 실패 — stale 유지 */ }
        })()
      );

      return cached;
    })()
  );
});

self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data ? JSON.parse(event.data.text()) : {};
  } catch {
    data = {};
  }

  const title = data.title || "헤아리";
  const body = data.body || "새로운 헤아리 문제가 시작되었습니다!";
  const date = data.date || "";
  const chosung = data.chosung || "";

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body,
        icon: "/pwa-icon-192.png",
        badge: "/pwa-badge-96.png",
        tag: "new-game",
        data: { date, chosung },
      });

      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({ type: "new-game", date, chosung });
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === "/" || client.url.startsWith(self.location.origin + "/")) {
          client.focus();
          return;
        }
      }
      return self.clients.openWindow("/");
    })
  );
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === "check-now") {
    event.waitUntil(
      (async () => {
        try {
          const res = await fetch("/api/game");
          const data = await res.json();
          const clients = await self.clients.matchAll({ type: "window" });
          for (const client of clients) {
            client.postMessage({ type: "new-game", date: data.date, chosung: data.chosung });
          }
        } catch { /* ignore */ }
      })()
    );
  }
});
