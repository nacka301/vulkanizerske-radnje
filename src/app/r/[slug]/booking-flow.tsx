"use client";

import { useEffect, useRef, useState } from "react";
import { ServiceStep } from "./service-step";
import { TimeStep } from "./time-step";
import { DetailsStep, type DetailsFormValues } from "./details-step";
import { ConfirmationStep } from "./confirmation-step";
import { createBookingAction, type AvailabilitySlot, type CreatedBooking, type PublicService, type PublicStore } from "./actions";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";

type Step =
  | { name: "service" }
  | { name: "time"; service: PublicService }
  | { name: "details"; service: PublicService; slot: AvailabilitySlot; holdId: string; holdExpiresAt: string }
  | { name: "confirmation"; booking: CreatedBooking };

export function BookingFlow({ store }: { store: PublicStore }) {
  const [step, setStep] = useState<Step>({ name: "service" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  // Kod prelaska na novi korak (npr. "Termin") sadrzaj se na mobitelu
  // centrira u vidljivom dijelu ekrana umjesto da ostane zalijepljen
  // gore ili da ostane na staroj scroll poziciji proslog koraka.
  useEffect(() => {
    stepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [step.name]);

  async function handleDetailsSubmit(values: DetailsFormValues) {
    if (step.name !== "details") return;
    setSubmitting(true);
    setSubmitError(null);

    const result = await createBookingAction({
      storeId: store.id,
      serviceId: step.service.id,
      holdId: step.holdId,
      startTime: step.slot.startTime,
      name: values.name,
      phone: values.phone,
      plate: values.plate,
      consent: values.consent,
      turnstileToken: values.turnstileToken,
    });

    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.error);
      if (result.code === "SLOT_TAKEN") {
        setStep({ name: "time", service: step.service });
      }
      return;
    }

    setStep({ name: "confirmation", booking: result.data });
  }

  return (
    <div ref={stepRef} className="mx-auto w-full max-w-lg px-4 py-8">
      <StepIndicator step={step.name} />

      {step.name === "service" && (
        <ServiceStep
          services={store.services}
          slotMinutes={store.slotMinutes}
          onSelect={(service) => setStep({ name: "time", service })}
        />
      )}

      {step.name === "time" && (
        <TimeStep
          store={store}
          service={step.service}
          onBack={() => setStep({ name: "service" })}
          onHoldCreated={(slot, holdId, holdExpiresAt) =>
            setStep({ name: "details", service: step.service, slot, holdId, holdExpiresAt })
          }
        />
      )}

      {step.name === "details" && (
        <DetailsStep
          holdExpiresAt={step.holdExpiresAt}
          onBack={() => setStep({ name: "time", service: step.service })}
          onExpired={() => setStep({ name: "time", service: step.service })}
          onSubmit={handleDetailsSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}

      {step.name === "confirmation" && (
        <ConfirmationStep
          store={store}
          booking={step.booking}
          onNewBooking={() => setStep({ name: "service" })}
        />
      )}
    </div>
  );
}

function StepIndicator({ step }: { step: Step["name"] }) {
  const steps: { key: Step["name"]; label: string }[] = [
    { key: "service", label: hr.booking.steps.service },
    { key: "time", label: hr.booking.steps.time },
    { key: "details", label: hr.booking.steps.details },
  ];

  if (step === "confirmation") return null;

  const activeIndex = steps.findIndex((s) => s.key === step);

  return (
    <ol className="mb-8 flex items-center text-sm">
      {steps.map((s, i) => (
        <li key={s.key} className="flex flex-1 items-center last:flex-none">
          <div className="flex items-center gap-2">
            <span
              className={
                i <= activeIndex
                  ? "flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground shadow-sm"
                  : "flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground"
              }
            >
              {i + 1}
            </span>
            <span className={i === activeIndex ? "font-medium whitespace-nowrap" : "whitespace-nowrap text-muted-foreground"}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <span
              className={cn(
                "mx-3 h-0.5 flex-1 rounded-full transition-colors",
                i < activeIndex ? "bg-primary" : "bg-muted",
              )}
            />
          )}
        </li>
      ))}
    </ol>
  );
}
