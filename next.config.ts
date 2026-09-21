import type { NextConfig } from "next";

// Poglavlje 8: sigurnosni headeri, bez trackera i bez kolacica osim
// Supabase sesije za prijavljene korisnike. Content-Security-Policy se
// postavlja dinamicki (per-request nonce) u src/proxy.ts, ne ovdje — App
// Router zahtijeva nonce za svoje inline hidracijske skripte, a next.config
// headers() ne moze generirati nasumican nonce po zahtjevu. Vidi
// DECISIONS.md.
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Javna booking stranica smije se framati sa ISTOG origina — koristi
        // se za "kako izgleda klijentu" pregled na /login (split-screen).
        // Sve ostalo (osobito /admin, /super) ostaje DENY protiv
        // clickjackinga; ovo pravilo je nakon opceg pa DENY overrida samo
        // za /r/* (zadnji header za isti kljuc na istoj putanji pobjedjuje).
        source: "/r/:path*",
        headers: [{ key: "X-Frame-Options", value: "SAMEORIGIN" }],
      },
    ];
  },
};

export default nextConfig;
