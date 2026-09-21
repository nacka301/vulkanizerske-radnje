import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/supabase/database.types";

/**
 * Browser klijent za admin sucelje — koristi anon/publishable kljuc, RLS
 * ogranicava vidljivost na temelju profiles retka prijavljenog korisnika
 * (poglavlje 3, tocka 3).
 */
export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
