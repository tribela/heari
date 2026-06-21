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

    const visibilityHandler = () => {
      if (document.visibilityState === "visible") {
        navigator.serviceWorker.controller?.postMessage({ type: "check-now" });
      }
    };
    document.addEventListener("visibilitychange", visibilityHandler);

    return () => {
      document.removeEventListener("visibilitychange", visibilityHandler);
    };
  }, []);

  return null;
}