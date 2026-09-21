"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hr } from "@/messages/hr";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { useWakeLock } from "@/lib/use-wake-lock";
import { playBeep } from "@/lib/play-beep";
import { useAdminStore } from "./admin-store-context";
import { BookingRow } from "./booking-row";
import { QuickEntryDialog } from "./quick-entry-dialog";
import type { AdminService } from "./page";

export type ScheduleBooking = {
  id: string;
  license_plate: string;
  client_name: string | null;
  client_phone: string | null;
  start_time: string;
  end_time: string;
  status: "CONFIRMED" | "COMPLETED" | "NO_SHOW" | "CANCELLED";
  source: "ONLINE" | "PHONE" | "WALK_IN";
  service_id: string;
  serviceName: string;
};

const POLL_MS = 15_000;

export function ScheduleView({ services }: { services: AdminService[] }) {
  const store = useAdminStore();
  useWakeLock();

  const [selectedDate, setSelectedDate] = useState(() => format(new TZDate(new Date(), store.timezone), "yyyy-MM-dd"));
  const [bookings, setBookings] = useState<ScheduleBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const dayRange = useMemo(() => {
    const start = new TZDate(`${selectedDate}T00:00:00`, store.timezone);
    const end = addDays(start, 1);
    return { start: new Date(start.getTime()).toISOString(), end: new Date(end.getTime()).toISOString() };
  }, [selectedDate, store.timezone]);

  const fetchBookings = useCallback(async (): Promise<ScheduleBooking[]> => {
    const { data } = await supabase
      .from("bookings")
      .select(
        "id, license_plate, client_name, client_phone, start_time, end_time, status, source, service_id, services (name)",
      )
      .eq("store_id", store.id)
      .gte("start_time", dayRange.start)
      .lt("start_time", dayRange.end)
      .order("start_time");

    return (data ?? []).map((b) => ({
      id: b.id,
      license_plate: b.license_plate,
      client_name: b.client_name,
      client_phone: b.client_phone,
      start_time: b.start_time,
      end_time: b.end_time,
      status: b.status,
      source: b.source,
      service_id: b.service_id,
      serviceName: b.services?.name ?? "",
    }));
  }, [supabase, store.id, dayRange]);

  // Koristi se iz event handlera (akcije na retku, brzi unos) — smije
  // slobodno zvati setState.
  const refresh = useCallback(async () => {
    setBookings(await fetchBookings());
  }, [fetchBookings]);

  useEffect(() => {
    let cancelled = false;

    async function run(silent: boolean) {
      if (!silent) setLoading(true);
      const result = await fetchBookings();
      if (cancelled) return;
      setBookings(result);
      if (!silent) setLoading(false);
    }

    void run(false);
    const interval = setInterval(() => void run(true), POLL_MS);

    const channel = supabase
      .channel(`admin-bookings-${store.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings", filter: `store_id=eq.${store.id}` },
        (payload) => {
          const row = payload.new as { id?: string; source?: string } | null;
          if (payload.eventType === "INSERT" && row?.source === "ONLINE") {
            playBeep();
            setHighlightId(row.id ?? null);
            setTimeout(() => setHighlightId(null), 4000);
          }
          void run(true);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      clearInterval(interval);
      void supabase.removeChannel(channel);
    };
  }, [supabase, store.id, fetchBookings]);

  const active = bookings.filter((b) => b.status === "CONFIRMED");
  const done = bookings.filter((b) => b.status !== "CONFIRMED");

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold">{hr.admin.schedule.title}</h1>
          <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => format(addDays(new TZDate(`${d}T00:00:00`, store.timezone), -1), "yyyy-MM-dd"))}>
            &larr;
          </Button>
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-12 w-auto text-base"
          />
          <Button variant="outline" size="icon" onClick={() => setSelectedDate((d) => format(addDays(new TZDate(`${d}T00:00:00`, store.timezone), 1), "yyyy-MM-dd"))}>
            &rarr;
          </Button>
        </div>
        <Button size="lg" className="h-12 px-6 text-base" onClick={() => setQuickEntryOpen(true)}>
          {hr.admin.schedule.quickEntry}
        </Button>
      </div>

      {loading ? (
        <p className="mt-8 text-muted-foreground">{hr.common.loading}</p>
      ) : bookings.length === 0 ? (
        <p className="mt-8 text-muted-foreground">{hr.admin.schedule.empty}</p>
      ) : (
        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            {active.map((b) => (
              <BookingRow
                key={b.id}
                booking={b}
                timezone={store.timezone}
                highlighted={b.id === highlightId}
                onChanged={refresh}
              />
            ))}
          </div>

          {done.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{hr.admin.schedule.doneSection}</h2>
              <div className="space-y-2 opacity-60">
                {done.map((b) => (
                  <BookingRow key={b.id} booking={b} timezone={store.timezone} highlighted={false} onChanged={refresh} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <QuickEntryDialog
        open={quickEntryOpen}
        onOpenChange={setQuickEntryOpen}
        services={services}
        timezone={store.timezone}
        onCreated={refresh}
      />
    </div>
  );
}
