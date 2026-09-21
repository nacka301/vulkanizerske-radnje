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

## Faza 1

- **`manage_token` vs `manage_token_hash`**: `bookings.manage_token` ostaje
  plaintext (nosi se u SMS linkovima), ali `client_cancel_booking` i
  `get_booking_by_token` traze redak preko `manage_token_hash` (generated
  `digest(manage_token,'sha256')` stupac, unique index). Razlog: poglavlje 8
  trazi "usporedbe tajni u konstantnom vremenu" — index scan po plaintext
  tajni moze curiti informaciju kroz vrijeme B-tree usporedbe, dok
  usporedba po hashu ne otkriva nista o originalnom tokenu.
- **`get_booking_by_token(p_token text)`**: nije eksplicitno navedena u
  poglavlju 5, ali nuzna je da `/r/[slug]/b/[token]` moze procitati
  rezervaciju — anon nema izravan pristup tablicama (poglavlje 3, tocka 2).
  Ista SECURITY DEFINER/REVOKE-GRANT shema kao ostale funkcije.
- **`validate_booking_slot(...)`**: interna pomocna funkcija (nije u
  poglavlju 5) koja objedinjuje provjere radnog vremena/poravnanja/lead-
  -time/horizon/blokada/kapaciteta — koriste je `create_hold`,
  `create_booking` i `reschedule_booking` da se ta logika ne duplicira tri
  puta. Nema samostalan GRANT prema `service_role` jer je pozivaju samo
  druge SECURITY DEFINER funkcije (nasljeduju privilegije vlasnika).
- **`app_settings` tablica + `app_setting()`**: SQL funkcije moraju
  sastaviti puni URL za otkazivanje (`APP_BASE_URL/r/{slug}/b/{token}`) pri
  insertu u `sms_outbox`, ali nemaju pristup Next.js env varijablama.
  Najjednostavnije rjesenje: jedan red u `app_settings` (`app_base_url`),
  seedan na `http://localhost:3000`, koji operater azurira nakon deploya
  (vidi README, Faza 6). Alternativa (Postgres GUC preko
  `ALTER DATABASE ... SET`) zahtijeva pristup bazi na infra razini i tesko
  se verzionira kroz migracije, pa je odbacena.
- **`create_booking` `booking_events.actor` za PHONE/WALK_IN**: potpis
  funkcije iz poglavlja 5 nema `p_actor` parametar, pa se za te izvore
  belezi `'system'` (za `ONLINE` belezi se `'client'`). Koji je admin unio
  telefonsku rezervaciju ne belezi se u audit logu — poznato ogranicenje,
  vidi README.
- **RLS helper funkcije (`auth_role()`, `auth_store_id()`)**: jedini
  izuzetak od pravila "REVOKE EXECUTE ... FROM authenticated" (poglavlje 8,
  tocka 2) — te dvije funkcije vracaju iskljucivo podatke o samom
  pozivatelju (njegovu ulogu/store_id iz `profiles`) i moraju biti pozive
  iz RLS izraza koji se evaluiraju kao `authenticated`. `SECURITY DEFINER`
  izbjegava beskonacnu rekurziju RLS politike nad `profiles`.
- **Rate limiting u Postgresu**: `rate_limits` tablica + `check_rate_limit()`
  SQL funkcija (fiksni prozor po minuti/kljucu), poziva se iz Next.js route
  handlera sa service-role klijentom prije `get_availability`/`create_hold`/
  `create_booking`. Bira se fixed-window (ne sliding/token-bucket) jer je
  najjednostavnije ispravno rjesenje za MVP opseg iz poglavlja 7.
- **Store CRUD (Faza 5) nije SQL funkcija**: poglavlje 5 ne navodi funkciju
  za kreiranje/uredivanje radionice. Buduci da service-role vec zaobilazi
  RLS u potpunosti, kreiranje/uredivanje radionice u super-admin sucelju
  ide kao izravan insert/update u server actionu (service-role klijent),
  bez dodatnog SQL wrappera — SQL funkcije su rezervirane za jezgru
  rezervacijske logike koja treba atomicnost/advisory lock.
- **GSM-7 predlosci u dvije verzije**: `build_sms_body` (SQL, stvarno
  slanje) i `src/lib/sms/templates.ts` (TS, cisto za Vitest testove iz
  poglavlja 9 i eventualni pregled u adminu) moraju ostati doslovno
  identicni — nema jedinstvenog izvora istine jer testovi (Vitest) ne mogu
  lako pokretati plpgsql bez zivog Postgresa unutar `pnpm test`.
- **Docker Desktop -> cloud Supabase projekt**: lokalni Docker Desktop na
  razvojnom stroju je pao na poznatom bugu ("Inference manager" servis ne
  moze obrisati zakljucanu `dockerInference` reparse-point datoteku, treba
  restart OS-a da se otkljuca). Umjesto cekanja, Faza 1 je verificirana nad
  novim cloud Supabase projektom `vulkanizerske-radnje` (ref
  `xwobgzzplievhlphjuox`, eu-central-1), kreiranim preko Supabase MCP-a.
  Organizacija je vec imala 2/2 aktivna besplatna projekta (Vercel
  integracija) — `ai-odvjetnik-dev` je pauziran (uz eksplicitnu potvrdu) da
  oslobodi slot.
- **`pgcrypto` zivi u shemi `extensions`, ne `public`**: Supabase (lokalno i
  hosted) predinstalira pgcrypto u `extensions`. Migracija
  `20260921100000_extensions_and_enums.sql` sada eksplicitno trazi tu shemu;
  funkcije koje pozivaju `digest()`/`gen_random_bytes()`
  (`client_cancel_booking`, `get_booking_by_token`) imaju
  `set search_path = public, extensions` umjesto samo `public`.
- **`pg_net` ostaje u `public` shemi**: Supabase security advisor javlja
  "Extension in Public" za `pg_net`, ali `ALTER EXTENSION pg_net SET SCHEMA`
  nije podrzan (pg_net-ove funkcije zive u fiksnoj shemi `net` bez obzira na
  to gdje je extension registriran) — upozorenje se svjesno ignorira.
- **Test konkurentnosti/RLS bez service_role kljuca**: u ovoj sesiji
  Supabase MCP namjerno ne izlaze `service_role` kljuc (sigurnosno
  ogranicenje alata), pa `scripts/concurrency-test.ts`/`scripts/rls-test.ts`
  (koje ce raditi automatizirano cim netko postavi
  `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY`) nisu mogle biti pokrenute
  kao Node skripta. Isti scenariji su rucno izvedeni kao 20 paralelnih
  `execute_sql` MCP poziva (prava paralelna DB konkurentnost, svaki poziv
  = zasebna transakcija) i kao simulirane `authenticated`/`anon` sesije
  (`set local role` + `request.jwt.claims`) — svi prolaze, vidi git log
  Faze 1.
