import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Provjerava sesiju i dohvaca store_id iz profila prijavljenog korisnika —
 * store_id se NIKAD ne uzima iz zahtjeva klijenta (poglavlje 3, tocka 4).
 * Baca gresku ako korisnik nije prijavljen ili nema store_admin profil.
 */
export async function requireStoreAdmin(): Promise<{ userId: string; storeId: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", user.id).maybeSingle();
  if (!profile?.store_id) throw new Error("FORBIDDEN");

  return { userId: user.id, storeId: profile.store_id };
}
