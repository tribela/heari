"use client";

import { Bell, BellOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export default function NotificationBell() {
  const [enabled, setEnabled] = useState(true);
  const [ready, setReady] = useState(false);
  const [tooltip, setTooltip] = useState(false);
  const longPress = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (typeof Notification === "undefined") return;

    const stored = localStorage.getItem("notifications_enabled");
    const val = stored !== null ? stored === "true" : Notification.permission === "granted";
    setEnabled(val);
    setReady(true);
  }, []);

  const syncPreference = useCallback((val: boolean) => {
    localStorage.setItem("notifications_enabled", String(val));
    navigator.serviceWorker.ready.then(async (reg) => {
      reg.active?.postMessage({
        type: "set-notifications",
        enabled: val,
      });

      // 알림 on/off에 따라 Periodic Sync 등록/해제
      try {
        const ps = (reg as any).periodicSync as
          | { getTags(): Promise<string[]>; register(tag: string, opts: { minInterval: number }): Promise<undefined>; unregister(tag: string): Promise<undefined> }
          | undefined;
        if (ps) {
          if (val) {
            const tags = await ps.getTags();
            if (!tags.includes("new-game-check")) {
              await ps.register("new-game-check", { minInterval: 60 * 60 * 1000 });
            }
          } else {
            await ps.unregister("new-game-check");
          }
        }
      } catch { /* not supported */ }
    });
  }, []);

  const toggle = useCallback(async () => {
    if (typeof Notification === "undefined" || !ready) return;

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      if (result === "denied") {
        setEnabled(false);
        syncPreference(false);
        return;
      }
      setEnabled(true);
      syncPreference(true);
      return;
    }

    if (Notification.permission === "denied") {
      setEnabled(false);
      syncPreference(false);
      return;
    }

    const newVal = !enabled;
    setEnabled(newVal);
    syncPreference(newVal);
  }, [ready, enabled, syncPreference]);

  const showTooltip = () => setTooltip(true);
  const hideTooltip = () => { clearTimeout(longPress.current); setTooltip(false); };
  const startLongPress = () => { longPress.current = setTimeout(() => setTooltip(true), 500); };

  if (typeof Notification === "undefined" || !ready) return null;

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
