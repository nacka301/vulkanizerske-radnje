import { LoginForm } from "./login-form";
import { BrandMark } from "@/components/brand-mark";
import { hr } from "@/messages/hr";

// Poglavlje 8: mora ostati dinamicka stranica. Ako se statiki
// predrendira (Next default za stranice bez dinamickih API poziva),
// nonce upisan u <script> tagove je fiksiran u build-time HTML-u, dok
// proxy.ts generira nov nonce za SVAKI zahtjev u CSP headeru — nikad se
// ne poklapaju u produkciji, pa browser blokira sav JS (dugmad ne rade,
// bez ijedne vidljive greske osim u konzoli). U `next dev` se ovo ne
// primjecuje jer dev server sve renderira dinamicki. Vidi DECISIONS.md.
export const dynamic = "force-dynamic";

export const metadata = {
  title: hr.auth.login.title,
};

function StepBadge({ n }: { n: number }) {
  return (
    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
      {n}
    </span>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex-1 overflow-hidden px-4 py-8 sm:py-12">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--primary), transparent 92%), transparent 60%)",
        }}
      />

      {/* Vodic za vulkanizere koji nisu tehnoloski potkovani: prvo im se
          pokaze sto klijent vidi (korak 1), tek onda prijava (korak 2) —
          redoslijed i objasnjenja namjerno jednostavna, vidljivo na svim
          velicinama ekrana (ne samo desktop split-screen kao ranije). */}
      <div className="mx-auto flex max-w-xl flex-col items-center gap-3 text-center">
        <BrandMark />
        <span className="text-xl font-bold">{hr.common.appName}</span>
      </div>

      <div className="mx-auto mt-8 max-w-xl">
        <div className="flex items-center gap-2">
          <StepBadge n={1} />
          <span className="text-sm font-semibold text-muted-foreground">{hr.auth.login.previewStepLabel}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold sm:text-2xl">{hr.auth.login.previewTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{hr.auth.login.previewSubtitle}</p>

        <div className="mt-4 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/60 px-3 py-2.5">
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            <span className="size-2.5 rounded-full bg-muted-foreground/30" />
          </div>
          <iframe src="/r/demo" title={hr.auth.login.previewTitle} className="h-[420px] w-full bg-background" />
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-xl">
        <div className="flex items-center gap-2">
          <StepBadge n={2} />
          <span className="text-sm font-semibold text-muted-foreground">{hr.auth.login.formStepLabel}</span>
        </div>
        <h2 className="mt-2 text-xl font-bold sm:text-2xl">{hr.auth.login.formStepTitle}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{hr.auth.login.formStepSubtitle}</p>

        <div className="mt-4 flex justify-center">
          <LoginForm />
        </div>
      </div>
    </main>
  );
}
