"use client";

import { useEffect, useRef } from "react";

function msUntilKSTMidnight(): number {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = Date.now() + kstOffset;
  const nextMidnight = (Math.floor(kstNow / 86400000) + 1) * 86400000;
  return nextMidnight - kstNow;
}

export default function PwaRegister() {
  const midnightTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    async function setup() {
      const reg = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      });

      // 알림 상태 읽기 (notification-bell.tsx와 동일한 로직)
      const stored = localStorage.getItem("notifications_enabled");
      const enabled = stored !== null ? stored === "true" : Notification.permission === "granted";

      // Periodic Background Sync (Chromium) — 알림 켜져 있을 때만 등록
      try {
        const ps = (reg as any).periodicSync as
          | { getTags(): Promise<string[]>; register(tag: string, opts: { minInterval: number }): Promise<undefined>; unregister(tag: string): Promise<undefined> }
          | undefined;
        if (ps) {
          if (enabled) {
            const tags = await ps.getTags();
            if (!tags.includes("new-game-check")) {
              await ps.register("new-game-check", { minInterval: 60 * 60 * 1000 });
            }
          } else {
            await ps.unregister("new-game-check");
          }
        }
      } catch { /* not supported */ }

      // localStorage에 설정된 알림 상태를 SW에 동기화
      reg.active?.postMessage({ type: "set-notifications", enabled });

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

    // 자정 정각 체크 (페이지 활성 시 SW setTimeout backup)
    midnightTimer.current = setTimeout(() => {
      navigator.serviceWorker.controller?.postMessage({ type: "check-now" });
    }, msUntilKSTMidnight());

    // Fallback: 주기적 체크 (Firefox/Safari — 페이지 활성 시)
    const fallbackTimer = setInterval(() => {
      navigator.serviceWorker.controller?.postMessage({ type: "check-now" });
    }, 300000);

    return () => {
      clearTimeout(midnightTimer.current);
      clearInterval(fallbackTimer);
    };
  }, []);

  return null;
}
