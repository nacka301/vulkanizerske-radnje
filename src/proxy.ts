import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/supabase/database.types";

const PROTECTED_PREFIXES = ["/admin", "/super"];
const isDev = process.env.NODE_ENV === "development";

function buildCsp(nonce: string, pathname: string): string {
  // Poglavlje 8: sigurnosni headeri. Next.js App Router streama RSC/
  // hidracijske podatke preko inline <script> tagova, pa strogi script-src
  // bez 'unsafe-inline' zahtijeva nonce (Next automatski nonce-a svoje
  // skripte kad prepozna nonce u CSP headeru) + 'strict-dynamic' da nonce-ani
  // bundle smije ucitati dodatne skripte (npr. Turnstile widget dinamicki
  // ubacen preko document.createElement) — vidi DECISIONS.md.
  //
  // frame-ancestors: /r/* (javna booking stranica) smije se framati sa
  // ISTOG origina — koristi se za "kako izgleda klijentu" pregled na
  // /login (split-screen, vidi login/page.tsx). frame-ancestors u CSP-u
  // nadjacava X-Frame-Options u modernim browserima, pa se mora ovdje
  // popustiti, ne samo u next.config.ts headers(). Sve ostalo ostaje
  // 'none' protiv clickjackinga.
  const frameAncestors = pathname.startsWith("/r/") ? "'self'" : "'none'";

  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
    // 'self' za /r/demo pregled na /login (split-screen) — inace
    // frame-src bez 'self' blokira i vlastiti origin.
    "frame-src 'self' https://challenges.cloudflare.com",
    `frame-ancestors ${frameAncestors}`,
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce, request.nextUrl.pathname);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request: { headers: requestHeaders } });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) => request.nextUrl.pathname.startsWith(prefix));

  if (isProtected && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
