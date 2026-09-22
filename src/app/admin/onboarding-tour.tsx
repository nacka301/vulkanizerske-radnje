"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { hr } from "@/messages/hr";
import { cn } from "@/lib/utils";

const STEPS = [
  { selector: '[data-tour="link"]', title: hr.admin.onboarding.step1Title, body: hr.admin.onboarding.step1Body },
  { selector: '[data-tour="duration"]', title: hr.admin.onboarding.step2Title, body: hr.admin.onboarding.step2Body },
  { selector: '[data-tour="break"]', title: hr.admin.onboarding.step3Title, body: hr.admin.onboarding.step3Body },
];

// Vodic za vulkanizere: svaki put kad udu u admin (svaka nova prijava/
// ulazak, layout se ne re-montira kod navigacije unutar admina) odvede
// ih u Postavke i redom istakne (spotlight) link/QR kod, upis trajanja
// usluge i pauzu u danu, uz jednostavno objasnjenje svakog. Namjerno se
// prikazuje SVAKI put (ne pamti "vidio sam"), mobile-first.
export function OnboardingTour() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (pathname !== "/admin/postavke") {
      router.push("/admin/postavke");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const measure = useCallback(() => {
    const el = document.querySelector(STEPS[stepIndex].selector);
    if (el) setRect(el.getBoundingClientRect());
  }, [stepIndex]);

  useEffect(() => {
    if (!active || pathname !== "/admin/postavke") return;
    const el = document.querySelector(STEPS[stepIndex].selector);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(measure, 350);
    window.addEventListener("scroll", measure, true);
    window.addEventListener("resize", measure);
    return () => {
      clearTimeout(t);
      window.removeEventListener("scroll", measure, true);
      window.removeEventListener("resize", measure);
    };
  }, [active, stepIndex, pathname, measure]);

  function finish() {
    setActive(false);
  }

  function next() {
    if (stepIndex === STEPS.length - 1) {
      finish();
      return;
    }
    setStepIndex((i) => i + 1);
  }

  if (!active || pathname !== "/admin/postavke") return null;

  const step = STEPS[stepIndex];

  return (
    <>
      {rect && (
        <div
          className="pointer-events-none fixed z-40 rounded-xl ring-2 ring-primary transition-all duration-300"
          style={{
            top: rect.top - 8,
            left: rect.left - 8,
            width: rect.width + 16,
            height: rect.height + 16,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
          }}
        />
      )}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-border bg-card p-5 shadow-2xl [padding-bottom:max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto flex max-w-md flex-col gap-3">
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span key={i} className={cn("h-1.5 flex-1 rounded-full", i <= stepIndex ? "bg-primary" : "bg-muted")} />
            ))}
          </div>
          <h3 className="text-lg font-bold">{step.title}</h3>
          <p className="text-sm text-muted-foreground">{step.body}</p>
          <div className="mt-1 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={finish}
              className="text-sm font-medium text-muted-foreground underline underline-offset-2"
            >
              {hr.admin.onboarding.skip}
            </button>
            <Button type="button" onClick={next} className="px-6">
              {stepIndex === STEPS.length - 1 ? hr.admin.onboarding.done : hr.admin.onboarding.next}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
