"use client";

import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from(rawData.split("").map((c) => c.charCodeAt(0)));
}

export default function NotificationBell() {
  const [enabled, setEnabled] = useState(() => {
    if (typeof Notification === "undefined") return true;
    const stored = localStorage.getItem("notifications_enabled");
    return stored !== null ? stored === "true" : Notification.permission === "granted";
  });
  const [tooltip, setTooltip] = useState(false);
  const longPress = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastTouchEnd = useRef(0);
  const subDone = useRef(false);

  const getReg = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return null;
    try {
      return await navigator.serviceWorker.ready;
    } catch {
      return null;
    }
  }, []);

  const subscribePush = useCallback(async (reg: ServiceWorkerRegistration) => {
    try {
      const existing = await reg.pushManager.getSubscription();
      if (existing) return existing;

      const res = await fetch("/api/push/vapid-key");
      const { publicKey } = await res.json();
      if (!publicKey) return null;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as unknown as BufferSource,
      });

      const json = sub.toJSON();
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        }),
      });

      return sub;
    } catch {
      return null;
    }
  }, []);

  const unsubscribePush = useCallback(async (reg: ServiceWorkerRegistration) => {
    try {
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const json = sub.toJSON();
      await sub.unsubscribe();
      await fetch("/api/push/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint }),
      });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof Notification === "undefined" || subDone.current) return;
    subDone.current = true;

    if (enabled && Notification.permission === "granted") {
      getReg().then((reg) => {
        if (reg) subscribePush(reg);
      });
    }
  }, [enabled, getReg, subscribePush]);

  const toggle = useCallback(async () => {
    if (typeof Notification === "undefined") return;

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result === "denied") {
        setEnabled(false);
        localStorage.setItem("notifications_enabled", "false");
        return;
      }
      setEnabled(true);
      localStorage.setItem("notifications_enabled", "true");
      const reg = await getReg();
      if (reg) await subscribePush(reg);
      return;
    }

    if (Notification.permission === "denied") {
      setEnabled(false);
      localStorage.setItem("notifications_enabled", "false");
      return;
    }

    const reg = await getReg();
    if (!reg) return;

    if (enabled) {
      await unsubscribePush(reg);
      setEnabled(false);
      localStorage.setItem("notifications_enabled", "false");
    } else {
      setEnabled(true);
      localStorage.setItem("notifications_enabled", "true");
      await subscribePush(reg);
    }
  }, [enabled, getReg, subscribePush, unsubscribePush]);

  const showTooltip = () => {
    if (Date.now() - lastTouchEnd.current > 300) setTooltip(true);
  };
  const hideTooltip = () => { clearTimeout(longPress.current); setTooltip(false); lastTouchEnd.current = Date.now(); };
  const startLongPress = () => { longPress.current = setTimeout(() => setTooltip(true), 500); };

  if (typeof Notification === "undefined") return null;

  const isDenied = Notification.permission === "denied";

  const tooltipText = isDenied
    ? "알림이 차단됨 (브라우저 설정에서 해제 필요)"
    : enabled
      ? "알림 켜짐 — 클릭하여 끄기"
      : "알림 꺼짐 — 클릭하여 켜기";

  return (
    <div className="relative">
      <button
        onClick={toggle}
        onTouchStart={startLongPress}
        onTouchEnd={hideTooltip}
        onTouchMove={hideTooltip}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className={`rounded-lg p-2 transition-colors ${
          enabled
            ? "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-700"
            : isDenied
              ? "text-red-300 hover:bg-zinc-100 dark:text-red-400 dark:hover:bg-zinc-800"
              : "text-zinc-300 hover:bg-zinc-100 dark:text-zinc-600 dark:hover:bg-zinc-800"
        }`}
        aria-label={enabled ? "알림 켜짐" : "알림 꺼짐"}
      >
        {enabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
      </button>
      {tooltip && (
        <div className="absolute right-0 top-full mt-1 z-50 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs text-zinc-600 shadow-lg dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
          {tooltipText}
        </div>
      )}
    </div>
  );
}