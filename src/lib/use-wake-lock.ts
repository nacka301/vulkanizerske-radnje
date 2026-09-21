"use client";

import { useEffect } from "react";

/**
 * Drzi ekran upaljenim dok je stranica otvorena (poglavlje 7 — admin radi na
 * tabletu u radionici). Tiho ne radi nista ako preglednik ne podrzava API.
 */
export function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    async function requestLock() {
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          await lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        // odbijeno (npr. tab nije vidljiv) — nije kriticno
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinel) {
        void requestLock();
      }
    }

    void requestLock();
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void sentinel?.release();
    };
  }, []);
}
