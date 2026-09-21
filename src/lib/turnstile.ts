import "server-only";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Provjerava Cloudflare Turnstile token na serveru prije create_hold/
 * create_booking za ONLINE izvor (poglavlje 8). Ako TURNSTILE_SECRET_KEY
 * nije postavljen (razvoj bez pravih kljuceva — vidi .env.example),
 * verifikacija se preskace uz upozorenje u logu.
 */
export async function verifyTurnstile(token: string, remoteIp: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;

  if (!secret) {
    console.warn(
      "[turnstile] TURNSTILE_SECRET_KEY nije postavljen — preskacem verifikaciju (razvojni mock).",
    );
    return true;
  }

  if (!token) return false;

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token, remoteip: remoteIp }),
  });

  if (!res.ok) return false;

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
