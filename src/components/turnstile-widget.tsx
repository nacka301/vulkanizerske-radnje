"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
    };
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const DEV_MOCK_TOKEN = "dev-mock-token";

/**
 * Cloudflare Turnstile widget (poglavlje 4/8). Ako NEXT_PUBLIC_TURNSTILE_SITE_KEY
 * nije postavljen (vidi .env.example — pravi kljucevi se ne izmisljaju),
 * prikazuje se razvojni mock koji automatski "prolazi" — server ionako
 * preskace stvarnu verifikaciju kad TURNSTILE_SECRET_KEY nije postavljen
 * (src/lib/turnstile.ts), pa je ovo samo da flow ostane testabilan lokalno.
 */
export function TurnstileWidget({ onVerify }: { onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    () => typeof window !== "undefined" && Boolean(window.turnstile),
  );
  const onVerifyRef = useRef(onVerify);

  useEffect(() => {
    onVerifyRef.current = onVerify;
  });

  useEffect(() => {
    if (!siteKey) {
      onVerifyRef.current(DEV_MOCK_TOKEN);
      return;
    }

    if (scriptLoaded) return;

    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.head.appendChild(script);
  }, [siteKey, scriptLoaded]);

  useEffect(() => {
    if (!siteKey || !scriptLoaded || !containerRef.current || !window.turnstile) return;
    window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token: string) => onVerifyRef.current(token),
    });
  }, [siteKey, scriptLoaded]);

  if (!siteKey) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        Captcha: razvojni mock (NEXT_PUBLIC_TURNSTILE_SITE_KEY nije postavljen)
      </div>
    );
  }

  return <div ref={containerRef} />;
}
