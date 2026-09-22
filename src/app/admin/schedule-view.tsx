"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { hr as hrLocale } from "date-fns/locale";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { formatHrDate } from "@/lib/format-hr";
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
  license_plate: string | null;
  client_name: string | null;
  client_phone: string | null;
  notes: string | null;
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
  const [view, setView] = useState<"calendar" | "day">("calendar");

  // Prelazak kalendar -> dan gura history zapis, tako da hardverska/
  // browser "natrag" tipka vrati na kalendar umjesto da izade iz admina
  // (na login) — bez ovoga je jedini history zapis bio login->admin.
  useEffect(() => {
    function onPopState(e: PopStateEvent) {
      const state = e.state as { adminView?: "day" } | null;
      setView(state?.adminView === "day" ? "day" : "calendar");
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const openDay = useCallback((date: string) => {
    window.history.pushState({ adminView: "day" }, "");
    setSelectedDate(date);
    setView("day");
  }, []);

  const closeDay = useCallback(() => {
    window.history.back();
  }, []);
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
        "id, license_plate, client_name, client_phone, notes, start_time, end_time, status, source, service_id, services (name)",
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
      notes: b.notes,
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

  if (view === "calendar") {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <h1 className="text-2xl font-bold">{hr.admin.schedule.pickDateTitle}</h1>
        <p className="mt-1 text-muted-foreground">{hr.admin.schedule.pickDateSubtitle}</p>

        <Card className="mt-6 w-fit p-4">
          <Calendar
            mode="single"
            locale={hrLocale}
            selected={new TZDate(`${selectedDate}T00:00:00`, store.timezone)}
            onSelect={(d) => {
              // Klik na vec odabrani (narancasti) dan react-day-picker tumaci
              // kao deselect (d === undefined) — u tom slucaju ipak zelimo
              // otvoriti taj isti (vec odabrani) dan, ne ignorirati klik.
              openDay(d ? format(d, "yyyy-MM-dd") : selectedDate);
            }}
            className="[--cell-size:--spacing(11)]"
          />
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-12"
            onClick={closeDay}
            aria-label={hr.admin.schedule.changeDate}
          >
            <CalendarDays className="size-5" />
          </Button>
          <Button variant="outline" size="icon" className="size-12" onClick={() => setSelectedDate((d) => format(addDays(new TZDate(`${d}T00:00:00`, store.timezone), -1), "yyyy-MM-dd"))}>
            &larr;
          </Button>
          <h1 className="text-xl font-bold tabular-nums sm:text-2xl">{formatHrDate(`${selectedDate}T00:00:00`, store.timezone)}</h1>
          <Button variant="outline" size="icon" className="size-12" onClick={() => setSelectedDate((d) => format(addDays(new TZDate(`${d}T00:00:00`, store.timezone), 1), "yyyy-MM-dd"))}>
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
