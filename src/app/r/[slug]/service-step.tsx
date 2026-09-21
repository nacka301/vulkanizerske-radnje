"use client";

import { Card } from "@/components/ui/card";
import { hr } from "@/messages/hr";
import type { PublicService } from "./actions";

export function ServiceStep({
  services,
  slotMinutes,
  onSelect,
}: {
  services: PublicService[];
  slotMinutes: number;
  onSelect: (service: PublicService) => void;
}) {
  return (
    <div>
      <h1 className="text-2xl font-bold">{hr.booking.serviceStep.title}</h1>
      <p className="mt-1 text-muted-foreground">{hr.booking.serviceStep.subtitle}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {services.map((service) => (
          <Card
            key={service.id}
            role="button"
            tabIndex={0}
            onClick={() => onSelect(service)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onSelect(service);
            }}
            className="cursor-pointer p-6 transition hover:border-primary hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
          >
            <div className="text-lg font-semibold">{service.name}</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {service.slots * slotMinutes} {hr.common.minutesShort}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
