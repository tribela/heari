"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function setup() {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      // Periodic Background Sync (Chromium)
      try {
        const ps = (reg as any).periodicSync as
          | { getTags(): Promise<string[]>; register(tag: string, opts: { minInterval: number }): Promise<undefined> }
          | undefined;
        if (ps) {
          const tags = await ps.getTags();
          if (!tags.includes("new-game-check")) {
            await ps.register("new-game-check", { minInterval: 6 * 60 * 60 * 1000 });
          }
        }
      } catch { /* not supported */ }

      // localStorage에 설정된 알림 상태를 SW에 동기화
      const stored = localStorage.getItem("notifications_enabled");
      if (stored !== null) {
        reg.active?.postMessage({ type: "set-notifications", enabled: stored === "true" });
      }

      // 이미 푼 날짜가 있으면 SW에 알려서 중복 알림 방지
      try {
        const stateRaw = localStorage.getItem("heari_state");
        if (stateRaw) {
          const state = JSON.parse(stateRaw);
          if (state.date) {
            reg.active?.postMessage({ type: "set-last-date", date: state.date });
          }
        }
      } catch { /* ignore */ }
    }

    setup();

    // Fallback: 주기적 체크 (Firefox/Safari — 페이지 활성 시)
    const fallbackTimer = setInterval(() => {
      navigator.serviceWorker.controller?.postMessage({ type: "check-now" });
    }, 60000);

    return () => clearInterval(fallbackTimer);
  }, []);

  return null;
}
