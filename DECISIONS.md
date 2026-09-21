# Odluke

Dokument bilježi odluke koje nisu eksplicitno propisane u specifikaciji
(`claude-code-prompt.md`), zajedno s obrazloženjem. Poredano kronološki.

## Faza 0

- **Next.js verzija**: 16.3.5 (najnovija stabilna u trenutku izrade).
- **Paket menadžer**: pnpm 12.x preko corepack/npm global installa (Docker
  Desktop okruženje nije imalo pnpm predinstaliran).
- **shadcn/ui base color**: `neutral`, `new-york` style (shadcn CLI default) —
  spec ne propisuje boju/stil.
- **Struktura**: `src/app` (App Router), `src/components`, `src/lib`,
  `src/messages/hr.ts` za sve UI stringove.
- **Zod verzija**: 4.x (najnovija). API je kompatibilan s onim što nam treba
  (`z.object`, `z.string()`, `.refine()`); pazimo na `z.email()` umjesto
  `.email()` lanca gdje je zgodnije.
- **Testovi**: Vitest za čistu logiku (`*.test.ts` uz izvorni fajl). Skripta
  za konkurentnost živi u `scripts/concurrency-test.ts`, pokreće se s `tsx`
  nad lokalnim Supabaseom (nije dio `vitest` runa jer zahtijeva pokrenutu
  bazu).
- **`claude-code-prompt.md`**: originalni zadatak, ostaje u rootu repozitorija
  kao referenca (nije dio aplikacije).
