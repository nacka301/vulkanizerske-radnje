"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

type LoginResult = { ok: true; role: "super_admin" | "store_admin" } | { ok: false; error: string };

export async function loginAction(email: string, password: string): Promise<LoginResult> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return { ok: false, error: "Neispravan e-mail ili zaporka." };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return { ok: false, error: "Korisnicki racun nema dodijeljenu ulogu. Obratite se administratoru." };
  }

  return { ok: true, role: profile.role };
}
