import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hr } from "@/messages/hr";
import { getStoreStatsAction } from "./actions";

function monthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(to) };
}

export default async function SuperStoreListPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: stores } = await supabase.from("stores").select("id, name, slug, active").order("name");

  const { from, to } = monthRange();
  const statsResult = await getStoreStatsAction(null, from, to, "month");
  const statsByStore = new Map((statsResult.ok ? statsResult.data : []).map((row) => [row.store_id, row]));

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{hr.super.list.title}</h1>
        <Button render={<Link href="/super/radionice/nova" />} nativeButton={false}>
          {hr.super.list.newStore}
        </Button>
      </div>

      {!stores || stores.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{hr.super.list.empty}</p>
      ) : (
        <div className="mt-6 grid gap-3">
          {stores.map((store) => {
            const stats = statsByStore.get(store.id);
            return (
              <Link key={store.id} href={`/super/radionice/${store.id}`}>
                <Card className="flex flex-wrap items-center gap-4 p-4 transition hover:border-primary">
                  <div className="min-w-48 flex-1">
                    <div className="font-semibold">{store.name}</div>
                    <div className="text-sm text-muted-foreground">/r/{store.slug}</div>
                  </div>
                  <Badge variant={store.active ? "default" : "secondary"}>
                    {store.active ? hr.admin.settings.open : hr.admin.settings.closed}
                  </Badge>
                  <div className="text-sm text-muted-foreground">
                    {hr.super.list.columnBookingsThisMonth}: <span className="font-medium text-foreground">{stats?.total ?? 0}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {hr.super.list.columnNoShowRate}:{" "}
                    <span className="font-medium text-foreground">
                      {stats?.no_show_rate != null ? `${Math.round(stats.no_show_rate * 100)}%` : "—"}
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
