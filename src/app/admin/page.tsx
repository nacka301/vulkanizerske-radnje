import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ScheduleView } from "./schedule-view";

export type AdminService = { id: string; name: string; slots: number };

export default async function AdminSchedulePage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("store_id").eq("id", user.id).maybeSingle();
  if (!profile?.store_id) redirect("/login");

  const { data: storeServices } = await supabase
    .from("store_services")
    .select("slots, services (id, name)")
    .eq("store_id", profile.store_id)
    .eq("enabled", true);

  const services: AdminService[] = (storeServices ?? [])
    .filter((row): row is typeof row & { services: NonNullable<typeof row.services> } => row.services !== null)
    .map((row) => ({ id: row.services.id, name: row.services.name, slots: row.slots }));

  return <ScheduleView services={services} />;
}
