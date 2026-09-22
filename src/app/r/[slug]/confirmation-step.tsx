"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatPlateDisplay } from "@/lib/plate";
import { formatHrDate, formatHrTime } from "@/lib/format-hr";
import { hr } from "@/messages/hr";
import type { CreatedBooking, PublicStore } from "./actions";

export function ConfirmationStep({
  store,
  booking,
  onNewBooking,
}: {
  store: PublicStore;
  booking: CreatedBooking;
  onNewBooking: () => void;
}) {
  const manageHref = `/r/${store.slug}/b/${booking.manage_token}`;

  return (
    <div>
      <div className="flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
        <Check className="size-7" strokeWidth={2.5} />
      </div>
      <h1 className="mt-4 text-2xl font-bold">{hr.booking.confirmation.title}</h1>
      <p className="mt-1 text-sm font-medium text-primary">{hr.booking.confirmation.checkPhoneNotice}</p>

      <Card className="mt-6 space-y-3 p-6">
        <Row label={hr.booking.confirmation.plateLabel} value={formatPlateDisplay(booking.license_plate ?? "")} big />
        <Row label={hr.booking.confirmation.dateLabel} value={formatHrDate(booking.start_time, store.timezone)} />
        <Row label={hr.booking.confirmation.timeLabel} value={formatHrTime(booking.start_time, store.timezone)} />
        {store.address && <Row label={hr.booking.confirmation.addressLabel} value={store.address} />}
      </Card>

      <p className="mt-6 text-sm text-muted-foreground">{hr.booking.confirmation.manageLinkIntro}</p>
      <Button render={<Link href={manageHref} />} nativeButton={false} variant="outline" className="mt-2 w-full">
        {hr.booking.confirmation.manageLinkCta}
      </Button>

      <Button variant="ghost" className="mt-4 w-full" onClick={onNewBooking}>
        {hr.booking.confirmation.newBooking}
      </Button>
    </div>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={big ? "font-mono text-2xl font-bold tabular-nums" : "font-medium"}>{value}</span>
    </div>
  );
}
