import { hr } from "@/messages/hr";
import { LoginSteps } from "./login-steps";

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

export default function LoginPage() {
  return (
    <main className="relative flex-1 overflow-hidden px-4 py-4 sm:py-8">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          backgroundImage:
            "radial-gradient(circle at 50% 0%, color-mix(in oklch, var(--primary), transparent 92%), transparent 60%)",
        }}
      />

      {/* Vodic za vulkanizere koji nisu tehnoloski potkovani: prikazuje se
          SAMO aktivni korak (klik na krug gore ili Dalje/Natrag prebacuje),
          ne oba stacked uz skrolanje — sve mora stati na ekran odjednom.
          Brend header namjerno izbacen (bespotreban prostor gore). */}
      <LoginSteps />
    </main>
  );
}
