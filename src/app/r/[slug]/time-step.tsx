"use client";

import { useEffect, useMemo, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatHrDayNumber, formatHrMonthShort, formatHrTime, formatHrWeekdayShort } from "@/lib/format-hr";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";
import { getAvailabilityAction, createHoldAction, type AvailabilitySlot, type PublicService, type PublicStore } from "./actions";

const AVAILABILITY_POLL_MS = 20_000;

function todayInTz(timezone: string): string {
  return format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
}

function isMorning(iso: string, timezone: string): boolean {
  const hour = Number(format(new TZDate(iso, timezone), "H"));
  return hour < 12;
}

export function TimeStep({
  store,
  service,
  onHoldCreated,
  onBack,
}: {
  store: PublicStore;
  service: PublicService;
  onHoldCreated: (slot: AvailabilitySlot, holdId: string, expiresAt: string) => void;
  onBack: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState(() => todayInTz(store.timezone));
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<string | null>(null);

  const dateStrip = useMemo(() => {
    const today = new TZDate(new Date(), store.timezone);
    return Array.from({ length: 14 }, (_, i) => {
      const d = addDays(today, i);
      return format(d, "yyyy-MM-dd");
    });
  }, [store.timezone]);

  useEffect(() => {
    let cancelled = false;

    async function run(silent: boolean) {
      if (!silent) setLoading(true);
      const result = await getAvailabilityAction(store.id, selectedDate, service.id);
      if (cancelled) return;
      if (result.ok) {
        setSlots(result.data);
        setError(null);
      } else {
        setError(result.error);
      }
      if (!silent) setLoading(false);
    }

    void run(false);
    const interval = setInterval(() => void run(true), AVAILABILITY_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [store.id, service.id, selectedDate]);

  const morning = slots.filter((s) => isMorning(s.startTime, store.timezone));
  const afternoon = slots.filter((s) => !isMorning(s.startTime, store.timezone));

  async function handlePick(slot: AvailabilitySlot) {
    setPendingSlot(slot.startTime);
    setError(null);
    const result = await createHoldAction(store.id, service.id, slot.startTime);
    setPendingSlot(null);
    if (!result.ok) {
      setError(result.error);
      const refreshed = await getAvailabilityAction(store.id, selectedDate, service.id);
      if (refreshed.ok) setSlots(refreshed.data);
      return;
    }
    onHoldCreated(slot, result.data.holdId, result.data.expiresAt);
  }

  return (
    <div>
      <Button variant="ghost" size="sm" onClick={onBack} className="mb-2 -ml-2">
        &larr; {hr.common.back}
      </Button>
      <h1 className="text-2xl font-bold">{hr.booking.timeStep.title}</h1>
      <p className="mt-1 text-muted-foreground">{hr.booking.timeStep.subtitle}</p>

      <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-2">
        {dateStrip.map((date) => (
          <button
            key={date}
            type="button"
            onClick={() => setSelectedDate(date)}
            className={cn(
              "flex min-w-16 flex-col items-center rounded-lg border px-3 py-2 text-sm transition",
              date === selectedDate
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-accent",
            )}
          >
            <span className="text-xs uppercase">{formatHrWeekdayShort(date, store.timezone)}</span>
            <span className="text-lg font-semibold">{formatHrDayNumber(date, store.timezone)}</span>
            <span className="text-xs">{formatHrMonthShort(date, store.timezone)}</span>
          </button>
        ))}

        <Popover>
          <PopoverTrigger
            render={<Button variant="outline" size="sm" className="min-w-16 shrink-0" />}
          >
            {hr.booking.timeStep.pickDate}
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={new TZDate(`${selectedDate}T00:00:00`, store.timezone)}
              onSelect={(d) => d && setSelectedDate(format(d, "yyyy-MM-dd"))}
              disabled={{ before: new TZDate(new Date(), store.timezone) }}
            />
          </PopoverContent>
        </Popover>
      </div>

      <p className="mt-2 text-xs text-muted-foreground">{hr.booking.timeStep.refreshHint}</p>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

      {loading ? (
        <div className="mt-6 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
      ) : slots.length === 0 ? (
        <p className="mt-6 text-muted-foreground">{hr.booking.timeStep.noSlots}</p>
      ) : (
        <div className="mt-6 space-y-6">
          {morning.length > 0 && (
            <SlotGroup
              label={hr.booking.timeStep.morning}
              slots={morning}
              timezone={store.timezone}
              pendingSlot={pendingSlot}
              onPick={handlePick}
            />
          )}
          {afternoon.length > 0 && (
            <SlotGroup
              label={hr.booking.timeStep.afternoon}
              slots={afternoon}
              timezone={store.timezone}
              pendingSlot={pendingSlot}
              onPick={handlePick}
            />
          )}
        </div>
      )}
    </div>
  );
}

function SlotGroup({
  label,
  slots,
  timezone,
  pendingSlot,
  onPick,
}: {
  label: string;
  slots: AvailabilitySlot[];
  timezone: string;
  pendingSlot: string | null;
  onPick: (slot: AvailabilitySlot) => void;
}) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-muted-foreground">{label}</h2>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {slots.map((slot) => (
          <Button
            key={slot.startTime}
            variant="outline"
            disabled={pendingSlot !== null}
            onClick={() => onPick(slot)}
            className="h-11 tabular-nums"
          >
            {pendingSlot === slot.startTime ? "..." : formatHrTime(slot.startTime, timezone)}
          </Button>
        ))}
      </div>
    </div>
  );
}
