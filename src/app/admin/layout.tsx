import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminShell } from "./admin-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("store_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.store_id) redirect("/login");

  const { data: store } = await supabase
    .from("stores")
    .select("id, name, slug, timezone")
    .eq("id", profile.store_id)
    .maybeSingle();

  if (!store) redirect("/login");

  return <AdminShell store={store}>{children}</AdminShell>;
}
