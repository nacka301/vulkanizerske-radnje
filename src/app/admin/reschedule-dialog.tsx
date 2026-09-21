"use client";

import { useEffect, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { formatHrTime } from "@/lib/format-hr";
import { hr } from "@/messages/hr";
import { adminAvailabilityAction, rescheduleBookingAction, type AdminAvailabilitySlot } from "./actions";

export function RescheduleDialog({
  open,
  onOpenChange,
  bookingId,
  serviceId,
  timezone,
  onRescheduled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  serviceId: string;
  timezone: string;
  onRescheduled: () => void;
}) {
  const [date, setDate] = useState(() => format(new TZDate(new Date(), timezone), "yyyy-MM-dd"));
  const [slots, setSlots] = useState<AdminAvailabilitySlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [notify, setNotify] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function run() {
      setLoadingSlots(true);
      const result = await adminAvailabilityAction(date, serviceId);
      if (cancelled) return;
      setLoadingSlots(false);
      if (result.ok) setSlots(result.data);
      else setError(result.error);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [open, date, serviceId]);

  async function handlePick(startTime: string) {
    setPending(true);
    setError(null);
    const result = await rescheduleBookingAction(bookingId, startTime, notify);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onOpenChange(false);
    onRescheduled();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{hr.admin.schedule.rescheduleDialogTitle}</DialogTitle>
        </DialogHeader>

        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-12" />

        <div className="flex items-center gap-2">
          <Checkbox id="reschedule-notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
          <Label htmlFor="reschedule-notify" className="font-normal">
            {hr.admin.schedule.notifySms}
          </Label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loadingSlots ? (
          <p className="text-sm text-muted-foreground">{hr.booking.timeStep.loadingSlots}</p>
        ) : slots.length === 0 ? (
          <p className="text-sm text-muted-foreground">{hr.admin.schedule.rescheduleDialogNoSlots}</p>
        ) : (
          <div className="grid max-h-64 grid-cols-4 gap-2 overflow-y-auto">
            {slots.map((slot) => (
              <Button
                key={slot.startTime}
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => handlePick(slot.startTime)}
                className="tabular-nums"
              >
                {formatHrTime(slot.startTime, timezone)}
              </Button>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {hr.common.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
