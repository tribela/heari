self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

const CACHE_NAME = "heari-v1";

async function getPrefs() {
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match("/notifications");
  return res ? res.json() : { enabled: false, lastDate: null, lastCheck: 0 };
}

async function savePrefs(prefs) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put("/notifications", new Response(JSON.stringify(prefs)));
}

async function checkNewGame() {
  try {
    const prefs = await getPrefs();
    if (!prefs.enabled) return;
    if (Date.now() - (prefs.lastCheck || 0) < 6 * 60 * 60 * 1000) return;

    prefs.lastCheck = Date.now();
    await savePrefs(prefs);

    const res = await fetch("/api/game");
    const data = await res.json();

    if (data.date !== prefs.lastDate) {
      prefs.lastDate = data.date;
      await savePrefs(prefs);

      await self.registration.showNotification("헤아리", {
        body: `오늘의 헤아리기: ${data.chosung}`,
        icon: "/pwa-icon?size=192",
        tag: "new-game",
      });
    }
  } catch {
    /* silent — network/cache/permission error */
  }
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "new-game-check") {
    event.waitUntil(checkNewGame());
  }
});

self.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === "check-now") {
    event.waitUntil(checkNewGame());
  } else if (msg.type === "set-notifications") {
    event.waitUntil(
      getPrefs().then((prefs) => {
        prefs.enabled = msg.enabled;
        return savePrefs(prefs);
      })
    );
  } else if (msg.type === "set-last-date") {
    event.waitUntil(
      getPrefs().then((prefs) => {
        prefs.lastDate = msg.date;
        return savePrefs(prefs);
      })
    );
  }
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
