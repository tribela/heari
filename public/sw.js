self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
        icon: "/pwa-icon?size=192",
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
