import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Poglavlje 8: sigurnosni headeri, bez trackera i bez kolacica osim
// Supabase sesije za prijavljene korisnike (nema treceg dodatnog trackera
// koji bi trebao dodatna pravila).
const CSP = [
  "default-src 'self'",
  // 'unsafe-eval' samo u razvoju (Fast Refresh/HMR), nikad u produkciji.
  `script-src 'self' https://challenges.cloudflare.com${isDev ? " 'unsafe-eval'" : ""}`,
  // Tailwind kompajlira u stylesheet, ali dinamicki racunati inline stilovi
  // (npr. visina stupca na grafu statistike) trebaju 'unsafe-inline'.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://challenges.cloudflare.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
