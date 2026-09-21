"use client";

import { useEffect, useState } from "react";

export function useCountdown(expiresAt: string | null): { secondsLeft: number; expired: boolean } {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!expiresAt) return { secondsLeft: 0, expired: false };

  const secondsLeft = Math.max(0, Math.floor((new Date(expiresAt).getTime() - now) / 1000));
  return { secondsLeft, expired: secondsLeft <= 0 };
}
