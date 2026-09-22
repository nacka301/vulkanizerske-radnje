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

export default function LoginPage() {
  return (
    <main className="flex flex-1">
      <div className="hidden flex-1 items-center justify-center bg-muted/30 p-10 lg:flex">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <span className="text-xl font-bold">{hr.common.appName}</span>
          </div>
          <h2 className="mt-6 text-2xl font-bold">{hr.auth.login.previewTitle}</h2>
          <p className="mt-2 text-muted-foreground">{hr.auth.login.previewSubtitle}</p>

          <div className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-card shadow-lg">
            <div className="flex items-center gap-1.5 border-b border-border/60 bg-muted/60 px-3 py-2.5">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
            </div>
            <iframe src="/r/demo" title={hr.auth.login.previewTitle} className="h-[460px] w-full bg-background" />
          </div>
        </div>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
        <div
          className="pointer-events-none absolute inset-0 -z-10 lg:hidden"
          style={{
            backgroundImage:
              "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--primary), transparent 88%), transparent 60%)",
          }}
        />
        <LoginForm />
      </div>
    </main>
  );
}
