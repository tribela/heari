self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      await self.clients.claim();
      await runCycle();
    })()
  );
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

function msUntilKSTMidnight() {
  const now = Date.now();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = now + kstOffset;
  const nextMidnight = (Math.floor(kstNow / 86400000) + 1) * 86400000;
  return nextMidnight - kstNow;
}

async function checkNewGame(force = false) {
  try {
    const prefs = await getPrefs();
    if (!prefs.enabled) return false;
    if (!force && Date.now() - (prefs.lastCheck || 0) < 10 * 60 * 1000) return false;

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
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function runCycle() {
  const prefs = await getPrefs();
  if (!prefs.enabled) {
    setTimeout(runCycle, msUntilKSTMidnight());
    return;
  }
  const sent = await checkNewGame(true);
  setTimeout(runCycle, sent ? msUntilKSTMidnight() : 5 * 60 * 1000);
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
