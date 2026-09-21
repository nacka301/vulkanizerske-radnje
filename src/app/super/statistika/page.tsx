import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { StatsView } from "./stats-view";

export default async function SuperStatsPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase.from("stores").select("id, name").order("name");

  return <StatsView stores={stores ?? []} />;
}
