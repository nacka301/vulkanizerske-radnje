import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function requireSuperAdmin(): Promise<{ userId: string }> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profile?.role !== "super_admin") throw new Error("FORBIDDEN");

  return { userId: user.id };
}
