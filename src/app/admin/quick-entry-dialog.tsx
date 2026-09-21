"use client";

import { useEffect, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { addDays, format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatHrTime } from "@/lib/format-hr";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";
import { adminAvailabilityAction, quickEntryAction, type AdminAvailabilitySlot } from "./actions";
import type { AdminService } from "./page";

const LAST_SERVICE_KEY = "vulkanizer:quick-entry:last-service";

export function QuickEntryDialog({
  open,
  onOpenChange,
  services,
  timezone,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  services: AdminService[];
  timezone: string;
  onCreated: () => void;
}) {
  const [serviceId, setServiceId] = useState<string>(services[0]?.id ?? "");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [todaySlots, setTodaySlots] = useState<AdminAvailabilitySlot[]>([]);
  const [tomorrowSlots, setTomorrowSlots] = useState<AdminAvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    function resetForm() {
      const lastService = localStorage.getItem(LAST_SERVICE_KEY);
      if (lastService && services.some((s) => s.id === lastService)) {
        setServiceId(lastService);
      } else if (services[0]) {
        setServiceId(services[0].id);
      }
      setSelectedSlot(null);
      setName("");
      setPhone("");
      setNotes("");
      setError(null);
    }

    resetForm();
  }, [open, services]);

  useEffect(() => {
    if (!open || !serviceId) return;
    let cancelled = false;

    async function run() {
      setLoadingSlots(true);
      const today = format(new TZDate(new Date(), timezone), "yyyy-MM-dd");
      const tomorrow = format(addDays(new TZDate(new Date(), timezone), 1), "yyyy-MM-dd");
      const [t, tm] = await Promise.all([
        adminAvailabilityAction(today, serviceId),
        adminAvailabilityAction(tomorrow, serviceId),
      ]);
      if (cancelled) return;
      setLoadingSlots(false);
      if (t.ok) setTodaySlots(t.data);
      if (tm.ok) setTomorrowSlots(tm.data);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, serviceId, timezone]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;
    setSubmitting(true);
    setError(null);

    const result = await quickEntryAction({ serviceId, startTime: selectedSlot, name, phone, notes });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    localStorage.setItem(LAST_SERVICE_KEY, serviceId);
    onOpenChange(false);
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{hr.admin.quickEntry.title}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>{hr.admin.quickEntry.service}</Label>
            <Select
              items={Object.fromEntries(services.map((s) => [s.id, s.name]))}
              value={serviceId}
              onValueChange={(value) => value && setServiceId(value)}
            >
              <SelectTrigger className="h-12 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loadingSlots ? (
            <p className="text-sm text-muted-foreground">{hr.booking.timeStep.loadingSlots}</p>
          ) : (
            <div className="space-y-3">
              <SlotPicker label={hr.admin.quickEntry.today} slots={todaySlots} timezone={timezone} selected={selectedSlot} onPick={setSelectedSlot} />
              <SlotPicker label={hr.admin.quickEntry.tomorrow} slots={tomorrowSlots} timezone={timezone} selected={selectedSlot} onPick={setSelectedSlot} />
              {todaySlots.length === 0 && tomorrowSlots.length === 0 && (
                <p className="text-sm text-muted-foreground">{hr.admin.quickEntry.noSlots}</p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qe-name">{hr.admin.quickEntry.name}</Label>
              <Input id="qe-name" required value={name} onChange={(e) => setName(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qe-phone">{hr.admin.quickEntry.phone}</Label>
              <Input id="qe-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-12" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="qe-notes">{hr.admin.quickEntry.notes}</Label>
            <Textarea
              id="qe-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={hr.admin.quickEntry.notesPlaceholder}
              className="min-h-20"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="submit" size="lg" className="h-12 w-full" disabled={submitting || !selectedSlot || !name.trim()}>
              {submitting ? hr.admin.quickEntry.submitting : hr.admin.quickEntry.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SlotPicker({
  label,
  slots,
  timezone,
  selected,
  onPick,
}: {
  label: string;
  slots: AdminAvailabilitySlot[];
  timezone: string;
  selected: string | null;
  onPick: (startTime: string) => void;
}) {
  if (slots.length === 0) return null;
  return (
    <div>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      <div className="flex flex-wrap gap-2">
        {slots.map((slot) => (
          <button
            key={slot.startTime}
            type="button"
            onClick={() => onPick(slot.startTime)}
            className={cn(
              "h-11 rounded-md border px-3 text-sm tabular-nums",
              selected === slot.startTime ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {formatHrTime(slot.startTime, timezone)}
          </button>
        ))}
      </div>
    </div>
  );
}
