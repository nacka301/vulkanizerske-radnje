"use client";

import { ChevronRight, CircleGauge, Disc3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { hr } from "@/messages/hr";
import type { PublicService } from "./actions";

function serviceIcon(name: string) {
  return /monti/i.test(name) ? CircleGauge : Disc3;
}

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

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const Icon = serviceIcon(service.name);
          return (
            <Card
              key={service.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect(service)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelect(service);
              }}
              className="group cursor-pointer flex-row items-center gap-4 p-5 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-2 focus-visible:outline-primary"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Icon className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-base font-semibold">{service.name}</div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  {service.slots * slotMinutes} {hr.common.minutesShort}
                </div>
              </div>
              <ChevronRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Card>
          );
        })}
      </div>
    </div>
  );
}
