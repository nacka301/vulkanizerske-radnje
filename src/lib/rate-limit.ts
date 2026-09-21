import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Fiksni prozor rate limit preko `check_rate_limit` SQL funkcije
 * (poglavlje 7). `key` treba biti jedinstven po IP-u i endpointu, npr.
 * `availability:1.2.3.4`.
 */
export async function checkRateLimit(
  key: string,
  limit: number,
  windowSeconds = 60,
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error("[rate-limit] provjera nije uspjela, dopustam zahtjev:", error.message);
    return true;
  }
  return data === true;
}
