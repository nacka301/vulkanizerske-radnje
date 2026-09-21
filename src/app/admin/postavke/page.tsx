import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { SettingsView } from "./settings-view";

export default async function AdminSettingsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", user.id).maybeSingle();
  if (!profile?.store_id) redirect("/login");

  const [{ data: store }, { data: hours }, { data: blocks }, { data: storeServices }] = await Promise.all([
    supabase.from("stores").select("bays").eq("id", profile.store_id).maybeSingle(),
    supabase.from("store_hours").select("weekday, open_time, close_time, is_closed").eq("store_id", profile.store_id),
    supabase
      .from("slot_blocks")
      .select("id, starts_at, ends_at, reason")
      .eq("store_id", profile.store_id)
      .order("starts_at"),
    supabase
      .from("store_services")
      .select("slots, enabled, services (id, name)")
      .eq("store_id", profile.store_id),
  ]);

  const services = (storeServices ?? [])
    .filter((row): row is typeof row & { services: NonNullable<typeof row.services> } => row.services !== null)
    .map((row) => ({ id: row.services.id, name: row.services.name, slots: row.slots, enabled: row.enabled }));

  return (
    <SettingsView
      bays={store?.bays ?? 1}
      hours={hours ?? []}
      blocks={blocks ?? []}
      services={services}
    />
  );
}
