"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatPlateDisplay } from "@/lib/plate";
import { formatHrDate, formatHrTime } from "@/lib/format-hr";
import { hr } from "@/messages/hr";
import { cancelManagedBooking, type ManagedBooking } from "./actions";

const STATUS_LABELS: Record<ManagedBooking["status"], string> = {
  CONFIRMED: hr.booking.manage.statusConfirmed,
  COMPLETED: hr.booking.manage.statusCompleted,
  NO_SHOW: hr.booking.manage.statusNoShow,
  CANCELLED: hr.booking.manage.statusCancelled,
};

export function ManageBookingView({ token, booking: initialBooking }: { token: string; booking: ManagedBooking }) {
  const [booking, setBooking] = useState(initialBooking);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nowMs] = useState(() => Date.now());

  const pastCutoff =
    new Date(booking.start_time).getTime() < nowMs + booking.cancelCutoffMinutes * 60_000;
  const canCancel = booking.status === "CONFIRMED" && !pastCutoff;

  async function handleCancel() {
    setCancelling(true);
    setError(null);
    const result = await cancelManagedBooking(token);
    setCancelling(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setBooking((b) => ({ ...b, status: "CANCELLED" }));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">{hr.booking.manage.title}</h1>

      <Card className="mt-6 space-y-3 p-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{hr.booking.manage.statusLabel}</span>
          <Badge variant={booking.status === "CONFIRMED" ? "default" : "secondary"}>
            {STATUS_LABELS[booking.status]}
          </Badge>
        </div>
        <Row label={hr.booking.confirmation.plateLabel} value={formatPlateDisplay(booking.license_plate ?? "")} big />
        <Row label={hr.booking.summary.service} value={booking.serviceName} />
        <Row label={hr.booking.confirmation.dateLabel} value={formatHrDate(booking.start_time, booking.storeTimezone)} />
        <Row label={hr.booking.confirmation.timeLabel} value={formatHrTime(booking.start_time, booking.storeTimezone)} />
        <Row label={hr.booking.summary.store} value={booking.storeName} />
        {booking.storeAddress && <Row label={hr.booking.confirmation.addressLabel} value={booking.storeAddress} />}
      </Card>

      {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

      {booking.status === "CANCELLED" && (
        <p className="mt-4 text-sm text-muted-foreground">{hr.booking.manage.cancelledNotice}</p>
      )}

      {booking.status !== "CONFIRMED" && booking.status !== "CANCELLED" && (
        <p className="mt-4 text-sm text-muted-foreground">{hr.booking.manage.alreadyResolved}</p>
      )}

      {canCancel && (
        <AlertDialog>
          <AlertDialogTrigger
            render={<Button variant="destructive" className="mt-6 w-full" disabled={cancelling} />}
          >
            {hr.booking.manage.cancelButton}
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{hr.booking.manage.cancelConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{hr.booking.manage.cancelConfirmBody}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{hr.booking.manage.cancelConfirmNo}</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancel}>{hr.booking.manage.cancelConfirmYes}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={big ? "font-mono text-xl font-bold tabular-nums" : "font-medium"}>{value}</span>
    </div>
  );
}
