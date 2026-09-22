"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";
import { LoginForm } from "./login-form";

function StepTab({
  n,
  label,
  active,
  onClick,
}: {
  n: number;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 rounded-lg py-1 transition-colors"
    >
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-colors",
          active
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted text-muted-foreground",
        )}
      >
        {n}
      </span>
      <span
        className={cn(
          "text-[11px] font-medium leading-tight",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

// Klikabilni koraci: prikazuje se samo AKTIVNI korak (bez skrolanja kroz
// oba), prebacivanje klikom na krug gore ili na "Dalje"/"Natrag" dugme —
// sve mora stati na ekran bez skrolanja, pa se sadrzaj drzi kompaktnim.
export function LoginSteps() {
  const [step, setStep] = useState<1 | 2>(1);

  return (
    <>
      <div className="relative mx-auto mt-3 grid max-w-[280px] grid-cols-2 gap-2">
        <div className="absolute left-[25%] right-[25%] top-[18px] -z-10 h-px bg-border" />
        <StepTab n={1} label={hr.auth.login.previewStepLabel} active={step === 1} onClick={() => setStep(1)} />
        <StepTab n={2} label={hr.auth.login.formStepLabel} active={step === 2} onClick={() => setStep(2)} />
      </div>

      {step === 1 ? (
        <div className="mx-auto mt-3 max-w-xl">
          <h1 className="text-lg font-bold sm:text-2xl">{hr.auth.login.previewTitle}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{hr.auth.login.previewSubtitle}</p>

          <div className="mt-2 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/60 px-3 py-2">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            </div>
            <iframe
              src="/r/demo"
              title={hr.auth.login.previewTitle}
              className="h-[min(56dvh,460px)] w-full bg-background sm:h-[min(66dvh,640px)]"
            />
          </div>

          <Button type="button" className="mt-4 w-full" onClick={() => setStep(2)}>
            {hr.common.next}
          </Button>
        </div>
      ) : (
        <div className="mx-auto mt-4 max-w-xl">
          <h2 className="text-lg font-bold sm:text-2xl">{hr.auth.login.formStepTitle}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{hr.auth.login.formStepSubtitle}</p>

          <div className="mt-3 flex justify-center">
            <LoginForm />
          </div>

          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-3 w-full text-center text-sm font-medium text-muted-foreground underline underline-offset-2"
          >
            {hr.common.back}
          </button>
        </div>
      )}
    </>
  );
}
