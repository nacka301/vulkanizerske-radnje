"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPlateDisplay } from "@/lib/plate";
import { formatHrTime } from "@/lib/format-hr";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";
import { setBookingStatusAction } from "./actions";
import { CancelDialog } from "./cancel-dialog";
import { RescheduleDialog } from "./reschedule-dialog";
import type { ScheduleBooking } from "./schedule-view";

const SOURCE_LABELS: Record<ScheduleBooking["source"], string> = {
  ONLINE: hr.admin.schedule.sourceOnline,
  PHONE: hr.admin.schedule.sourcePhone,
  WALK_IN: hr.admin.schedule.sourceWalkIn,
};

export function BookingRow({
  booking,
  timezone,
  highlighted,
  onChanged,
}: {
  booking: ScheduleBooking;
  timezone: string;
  highlighted: boolean;
  onChanged: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const isConfirmed = booking.status === "CONFIRMED";

  async function handleStatus(status: "COMPLETED" | "NO_SHOW") {
    setPending(true);
    await setBookingStatusAction(booking.id, status, false);
    setPending(false);
    onChanged();
  }

  return (
    <Card
      className={cn(
        "flex flex-col items-center gap-3 p-4 text-center transition-colors sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:text-left",
        highlighted && "border-primary bg-primary/5",
      )}
    >
      <div className="text-xl font-bold tabular-nums sm:w-20 sm:shrink-0">{formatHrTime(booking.start_time, timezone)}</div>

      <div className="sm:min-w-40 sm:flex-1">
        {booking.license_plate ? (
          <>
            <div className="font-mono text-2xl font-bold tabular-nums">{formatPlateDisplay(booking.license_plate)}</div>
            {(booking.client_name || booking.client_phone) && (
              <div className="text-sm text-muted-foreground">
                {[booking.client_name, booking.client_phone].filter(Boolean).join(" · ")}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-lg font-bold">{booking.client_name || hr.admin.schedule.noPlate}</div>
            {booking.client_phone && <div className="text-sm text-muted-foreground">{booking.client_phone}</div>}
          </>
        )}
        {booking.notes && <div className="mt-1 text-sm text-muted-foreground italic">{booking.notes}</div>}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
        <Badge variant="secondary">{booking.serviceName}</Badge>
        <Badge variant="outline">{SOURCE_LABELS[booking.source]}</Badge>
      </div>

      {isConfirmed && (
        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <Button className="h-11 text-sm sm:h-12 sm:text-base" variant="outline" disabled={pending} onClick={() => handleStatus("COMPLETED")}>
            {hr.admin.schedule.actionDone}
          </Button>
          <Button className="h-11 text-sm sm:h-12 sm:text-base" variant="outline" disabled={pending} onClick={() => handleStatus("NO_SHOW")}>
            {hr.admin.schedule.actionNoShow}
          </Button>
          <Button className="h-11 text-sm sm:h-12 sm:text-base" variant="outline" disabled={pending} onClick={() => setRescheduleOpen(true)}>
            {hr.admin.schedule.actionReschedule}
          </Button>
          <Button className="h-11 text-sm sm:h-12 sm:text-base" variant="destructive" disabled={pending} onClick={() => setCancelOpen(true)}>
            {hr.admin.schedule.actionCancel}
          </Button>
        </div>
      )}

      <CancelDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        bookingId={booking.id}
        hasPhone={!!booking.client_phone}
        onCancelled={onChanged}
      />
      <RescheduleDialog
        open={rescheduleOpen}
        onOpenChange={setRescheduleOpen}
        bookingId={booking.id}
        serviceId={booking.service_id}
        timezone={timezone}
        onRescheduled={onChanged}
      />
    </Card>
  );
}
