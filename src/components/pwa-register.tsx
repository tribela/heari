"use client";

import { useEffect } from "react";

export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      .then((reg) => {
        const ps = (reg as any).periodicSync as
          | { getTags(): Promise<string[]>; register(tag: string, opts: { minInterval: number }): Promise<undefined> }
          | undefined;
        if (ps) {
          ps.getTags()
            .then((tags) => {
              if (!tags.includes("new-game-check")) {
                ps.register("new-game-check", {
                  minInterval: 6 * 60 * 60 * 1000,
                });
              }
            })
            .catch(() => {});
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
      })
      .catch(() => {});

    const fallbackTimer = setInterval(() => {
      navigator.serviceWorker.controller?.postMessage({ type: "check-now" });
    }, 60000);

    return () => clearInterval(fallbackTimer);
  }, []);

  return null;
}
