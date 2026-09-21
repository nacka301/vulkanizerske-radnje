"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { hr } from "@/messages/hr";
import { getStoreStatsAction, type StoreStatsRow } from "../actions";

function defaultRange() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { from: iso(from), to: iso(now) };
}

function aggregateByBucket(rows: StoreStatsRow[]) {
  const map = new Map<
    string,
    { bucket: string; total: number; completed: number; cancelled: number; no_show: number }
  >();

  for (const r of rows) {
    const existing = map.get(r.bucket) ?? { bucket: r.bucket, total: 0, completed: 0, cancelled: 0, no_show: 0 };
    existing.total += r.total;
    existing.completed += r.completed;
    existing.cancelled += r.cancelled;
    existing.no_show += r.no_show;
    map.set(r.bucket, existing);
  }

  return [...map.values()]
    .map((v) => ({
      ...v,
      no_show_rate: v.completed + v.no_show > 0 ? v.no_show / (v.completed + v.no_show) : null,
    }))
    .sort((a, b) => a.bucket.localeCompare(b.bucket));
}

export function StatsView({ stores }: { stores: { id: string; name: string }[] }) {
  const initialRange = defaultRange();
  const [storeId, setStoreId] = useState<string>("all");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [group, setGroup] = useState<"day" | "month">("month");
  const [rows, setRows] = useState<StoreStatsRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const result = await getStoreStatsAction(storeId === "all" ? null : storeId, from, to, group);
      if (cancelled) return;
      setRows(result.ok ? result.data : []);
      setLoading(false);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [storeId, from, to, group]);

  const aggregated = aggregateByBucket(rows);
  const maxTotal = Math.max(1, ...aggregated.map((r) => r.total));

  return (
    <div>
      <h1 className="text-2xl font-bold">{hr.super.stats.title}</h1>

      <Card className="mt-4 flex flex-wrap items-end gap-4 p-4">
        <div className="space-y-1.5">
          <Label>{hr.super.list.title}</Label>
          <Select
            items={{ all: hr.super.stats.allStores, ...Object.fromEntries(stores.map((s) => [s.id, s.name])) }}
            value={storeId}
            onValueChange={(v) => v && setStoreId(v)}
          >
            <SelectTrigger className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{hr.super.stats.allStores}</SelectItem>
              {stores.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{hr.super.stats.from}</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>{hr.super.stats.to}</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>&nbsp;</Label>
          <Select
            items={{ day: hr.super.stats.groupDay, month: hr.super.stats.groupMonth }}
            value={group}
            onValueChange={(v) => v && setGroup(v as "day" | "month")}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">{hr.super.stats.groupDay}</SelectItem>
              <SelectItem value="month">{hr.super.stats.groupMonth}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {loading ? (
        <p className="mt-6 text-muted-foreground">{hr.common.loading}</p>
      ) : aggregated.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{hr.super.stats.noData}</p>
      ) : (
        <>
          <Card className="mt-4 p-4">
            <div className="flex h-40 items-end gap-2">
              {aggregated.map((row) => (
                <div key={row.bucket} className="flex flex-1 flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-primary"
                    style={{ height: `${Math.max(4, (row.total / maxTotal) * 100)}%` }}
                    title={`${row.bucket}: ${row.total}`}
                  />
                  <span className="text-[10px] text-muted-foreground">{row.bucket.slice(5)}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="mt-4 overflow-x-auto p-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-4">{group === "day" ? "Dan" : "Mjesec"}</th>
                  <th className="py-2 pr-4">{hr.super.stats.total}</th>
                  <th className="py-2 pr-4">{hr.super.stats.completed}</th>
                  <th className="py-2 pr-4">{hr.super.stats.cancelled}</th>
                  <th className="py-2 pr-4">{hr.super.stats.noShow}</th>
                  <th className="py-2 pr-4">{hr.super.stats.noShowRate}</th>
                </tr>
              </thead>
              <tbody>
                {aggregated.map((row) => (
                  <tr key={row.bucket} className="border-b last:border-0">
                    <td className="py-2 pr-4">{row.bucket}</td>
                    <td className="py-2 pr-4">{row.total}</td>
                    <td className="py-2 pr-4">{row.completed}</td>
                    <td className="py-2 pr-4">{row.cancelled}</td>
                    <td className="py-2 pr-4">{row.no_show}</td>
                    <td className="py-2 pr-4">{row.no_show_rate != null ? `${Math.round(row.no_show_rate * 100)}%` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
