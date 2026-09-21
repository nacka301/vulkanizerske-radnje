"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { hr } from "@/messages/hr";
import { setBookingStatusAction } from "./actions";

export function CancelDialog({
  open,
  onOpenChange,
  bookingId,
  hasPhone,
  onCancelled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingId: string;
  hasPhone: boolean;
  onCancelled: () => void;
}) {
  const [notify, setNotify] = useState(true);
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    await setBookingStatusAction(bookingId, "CANCELLED", notify && hasPhone);
    setPending(false);
    onOpenChange(false);
    onCancelled();
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{hr.admin.schedule.cancelDialogTitle}</AlertDialogTitle>
        </AlertDialogHeader>

        {hasPhone && (
          <div className="flex items-center gap-2 py-2">
            <Checkbox id="notify" checked={notify} onCheckedChange={(v) => setNotify(v === true)} />
            <Label htmlFor="notify" className="font-normal">
              {hr.admin.schedule.notifySms}
            </Label>
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel>{hr.admin.schedule.cancelDialogCancel}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={pending}>
            {hr.admin.schedule.cancelDialogConfirm}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
