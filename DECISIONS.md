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
## Faza 2

- **Turnstile se provjerava samo prije `create_booking`, ne i prije `create_hold`**:
  poglavlje 8 doslovno trazi verifikaciju "prije create_hold i
  create_booking", ali Cloudflare Turnstile tokeni su jednokratni (jednom
  iskoristeni vise ne prolaze siteverify), a poglavlje 7 captchu prikazuje
  tek u koraku 3 ("Podaci"), nakon sto je hold vec kreiran u koraku 2 klikom
  na termin. Dvije odvojene captche (jedna za hold, jedna za booking) nisu
  specificirane i losije su UX. Zato se captcha provjerava samo prije
  `create_booking` (jedina akcija koja trajno upisuje podatke i salje SMS);
  `create_hold` je zasticen IP rate limitom (5/min, poglavlje 7), sto je
  dovoljna obrana za privremeni 3-min hold koji sam istice.
- **`TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY` prazni u razvoju**: prema
  uputi da se ne izmisljaju API kljucevi, `TurnstileWidget` (klijent) prikazuje
  razvojni mock koji odmah "prolazi" kad `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  nije postavljen, a `verifyTurnstile` (server) preskace stvarni poziv na
  Cloudflare kad `TURNSTILE_SECRET_KEY` nije postavljen. Kad se pravi
  kljucevi dodaju u `.env.local`, oboje automatski prelazi na stvarnu
  verifikaciju bez izmjene koda.
- **`check_rate_limit` fail-open**: ako sam RPC poziv za rate limit
  neocekivano padne (npr. mrezni problem), zahtjev se ipak propusta umjesto
  blokira — rate limit je zastita od zlouporabe, ne sigurnosna granica (to
  su RLS + SECURITY DEFINER funkcije), pa je dostupnost vazenija od stroge
  primjene limita u rijetkom slucaju infrastrukturnog kvara.
- **Browser testiranje Faze 2**: u ovoj sesiji nije bilo moguce pokrenuti
  `pnpm dev` i rucno testirati tok u pregledniku jer `SUPABASE_SERVICE_ROLE_KEY`
  nije bio dostupan (MCP ga ne izlaze, korisnik je odabrao da to sam
  testira). Ispravnost je provjerena preko `pnpm build`/`tsc`/`lint`/`vitest`
  (svi prolaze bez upozorenja) i izravnih `execute_sql` poziva nad SQL
  funkcijama iz Faze 1. Rucna provjera u pregledniku (scenarij 1 iz
  poglavlja 9) ostaje za korisnika.

## Faza 3

- **sms-worker konfiguracija ide preko `app_settings`, ne preko Deno secreta**:
  Supabase MCP nema alat za `supabase secrets set` (postavljanje Edge
  Function environment varijabli). Umjesto WORKER_SECRET/SMS_PROVIDER/
  SMS_SENDER_ID/TWILIO_* kao Deno.env varijabli, worker ih cita iz
  `app_settings` tablice preko service-role klijenta (koji svaka Edge
  Function automatski dobiva kao SUPABASE_SERVICE_ROLE_KEY). `pg_cron`
  cron posao isto cita `worker_secret`/`sms_worker_url` iz `app_settings`
  prije `net.http_post` poziva — jedan izvor istine, bez duplikacije tajne.
  Za pravu CLI instalaciju s `supabase secrets set` ovo bi se moglo
  zamijeniti s Deno.env citanjem bez izmjene ostatka workera; `.env.example`
  ostaje kao referenca/dokumentacija.
- **`sms_outbox.sending_at` kolona** (nije u originalnoj shemi iz poglavlja
  4): nuzna da worker zna koliko dugo je redak u SENDING statusu i moze ga
  vratiti u PENDING nakon 5 min (poglavlje 6, tocka 4 workera).
- **`claim_pending_sms(limit)` i `recover_stuck_sms()` SQL funkcije**:
  `SELECT ... FOR UPDATE SKIP LOCKED` ne postoji kao PostgREST/RPC
  primitiva preko obicnog `.from().select()` poziva, pa je atomsko
  "zauzimanje" redaka izdvojeno u SQL funkciju koju worker poziva preko RPC-a.
- **Edge Function deployana s `verify_jwt: false`**: sms-worker ima vlastitu
  autentifikaciju (x-worker-secret, konstantno-vremenska usporedba) jer ga
  poziva pg_cron/pg_net (bez korisnicke JWT sesije), ne krajnji korisnik —
  standardni Supabase JWT verify bi blokirao takve pozive.
- **`app_settings.sms_worker_url` hardkodiran na cloud projekt**
  (`https://xwobgzzplievhlphjuox.supabase.co/functions/v1/sms-worker`): za
  lokalni Docker stack treba rucno azurirati na
  `http://127.0.0.1:54321/functions/v1/sms-worker` (ili odgovarajuci port
  iz `supabase/config.toml`) nakon `supabase start`.
- **End-to-end provjera workera**: rucno testirano preko `execute_sql`
  (kreirana rezervacija s telefonom -> CONFIRMATION red u `sms_outbox`) i
  izravnog `curl` poziva na deployanu funkciju: (1) uspjesno slanje ->
  `SENT` + `provider_message_id`; (2) pogresna tajna -> `401`; (3) namjerno
  neispravne Twilio "kredencijale" (privremeno u `app_settings`, ocisceno
  nakon testa) da se dokaze retry/backoff (`attempts` 1->2->3,
  `scheduled_at` pomaknut, na kraju `FAILED`). Svi scenariji prolaze — vidi
  git log poruku Faze 3.

## Faza 4

- **`requireStoreAdmin()` (src/lib/require-store-admin.ts)**: svaka admin
  server akcija cita `store_id` iz `profiles` retka prijavljenog korisnika
  preko SSR (kolacic) klijenta, nikad iz parametra koji salje klijent
  (poglavlje 3, tocka 4 — "store_id iz profiles, nikad iz zahtjeva").
  Nakon toga akcija koristi service-role klijent za stvarni upis/RPC poziv.
- **Postavke (radno vrijeme, dizalice, usluge, blokade) idu izravnim
  service-role upisom u tablice**, ne kroz SQL funkcije — u skladu s Fazom 1
  odlukom da su SQL funkcije rezervirane za jezgru rezervacijske logike.
  Greske iz DB CHECK constrainta (`store_hours_aligned`,
  `stores_bays_check`...) mapiraju se na hrvatske poruke u
  `admin/postavke/actions.ts`.
- **Admin citanje ide izravno iz browsera + RLS** (poglavlje 3, tocka 3) za
  obicne SELECT-ove (raspored, postavke na ucitavanju stranice preko SSR
  klijenta). Iznimka: `get_availability` (za "Pomakni"/"Brzi unos") je
  SECURITY DEFINER funkcija bez GRANT-a za `authenticated`, pa ide preko
  server akcije (`adminAvailabilityAction`) sa service-role klijentom, uz
  `requireStoreAdmin()` provjeru.
- **Realtime**: `bookings` je dodan u `supabase_realtime` publikaciju
  (migracija `20260921120000_enable_realtime_bookings.sql`). RLS i dalje
  vrijedi za `postgres_changes` pretplate (store_admin prima samo redke
  vlastite radionice), a `filter: store_id=eq.<id>` na kanalu je dodatna
  ucinkovitost, ne sigurnosna granica.
- **Zvuk bez audio datoteke**: `playBeep()` generira ton preko Web Audio
  API-ja (oscillator) umjesto ucitavanja `.mp3` asseta — jednostavnije i bez
  dodatnog binarnog fajla u repou.
- **Screen Wake Lock**: `useWakeLock()` tiho ne radi nista ako API nije
  podrzan (Safari desktop, stariji preglednici) — nije kriticno za MVP.
- **"Brzi unos" default usluga**: zadnje koristena usluga pamti se u
  `localStorage` (per-uredaj, ne per-korisnik) — dovoljno za jedan tablet po
  radionici iz poglavlja 7; nije spremljeno u bazu jer nije potrebno dijeliti
  izmedju uredaja.
- **Demo store_admin racun** (`admin@demo.vulkanizer.hr`) kreiran izravno
  preko `execute_sql` (isti pristup kao RLS testovi u Fazi 1) jer MCP nema
  poziv ekvivalentan `supabase.auth.admin.createUser`. Lozinka je u
  README-u — prihvatljivo za demo/dev racun, zamijeniti prije produkcije.
- **`middleware.ts` -> `proxy.ts`**: Next.js 16 je preimenovao konvenciju
  (stari naziv baca deprecation upozorenje na buildu); `pnpm build` mora
  proci bez upozorenja (poglavlje 10, Faza 6), pa je datoteka preimenovana i
  funkcija exportana kao `proxy` umjesto `middleware`.

## Faza 5

- **Kreiranje admina radionice**: `createStoreAdminAction` koristi
  `supabase.auth.admin.createUser` (service role) s generiranom privremenom
  zaporkom (12 nasumicnih bajtova), prikazanom super-adminu JEDNOM u
  sucelju odmah nakon kreiranja (ne sprema se nigdje). Spec spominje "poziv
  emailom ili privremena zaporka" — buduci da SMTP/email provajder nije
  konfiguriran (nema navedenih kljuceva), koristi se samo prikaz privremene
  zaporke; e-mail poziv ostaje poznato ogranicenje za Fazu 6.
- **`store_hours` se popunjava default vrijednostima pri kreiranju
  radionice** (pon-pet 08-16, sub 08-13, ned zatvoreno) — super-admin ih
  odmah moze prilagoditi kroz `/admin/postavke` (kao store_admin) ili
  buduca dorada `/super` sucelja; spec ne trazi da super-admin forma za
  novu radionicu odmah prikuplja puno radno vrijeme po danu, pa je default +
  naknadna izmjena najjednostavnije rjesenje.
- **QR kod generira se client-side** (`qrcode` paket, `QRCode.toDataURL`/
  `toString`) koristeci `window.location.origin` kao baznu URL — izbjegava
  potrebu za izlaganjem `APP_BASE_URL` kao `NEXT_PUBLIC_*` varijable, i
  tocno odgovara stvarnoj domeni s koje je `/super` posluzen.
- **Timezone kao slobodan tekst input** (default "Europe/Zagreb") umjesto
  padajuceg izbornika IANA zona — MVP opseg je hrvatsko trziste, puni
  IANA-zone picker nije potreban.
- **Statistika bez graf-biblioteke**: jednostavan CSS bar-chart (div
  visina proporcionalna vrijednosti) umjesto uvodenja nove ovisnosti izvan
  fiksnog stacka iz poglavlja 2 — zadovoljava "grafovi po danu/mjesecu" bez
  dodatne biblioteke.
- **`store_stats` agregacija "sve radionice"**: kad je odabrano "Sve
  radionice", RPC vraca redak po (bucket, store_id); klijent ih zbraja po
  bucketu (`aggregateByBucket`) i ponovno racuna `no_show_rate` iz
  zbrojenih brojaca (ne prosjek postotaka) da ostane matematicki ispravno.
- **Demo super_admin racun** (`super@demo.vulkanizer.hr`) kreiran isto kao
  demo store_admin u Fazi 4 — izravno u `auth.users` preko `execute_sql`.

## Faza 6

- **CSP dopusta `'unsafe-inline'` za `style-src`**: graf statistike
  (`/super/statistika`) koristi React inline `style={{height:...}}` za
  visinu stupaca — jednostavnije od generiranja nonce-a za svaki server
  render. `script-src` ostaje strog (samo `'self'` + Cloudflare Turnstile
  domena, `'unsafe-eval'` samo u razvoju za Fast Refresh).
- **PII maskiranje u logovima**: jedino mjesto koje je stvarno logiralo
  osobne podatke bio je `ConsoleSmsProvider` (broj mobitela u prefiksu
  log linije) — sada maskiran (`+3859***...**67`). Sama poruka (body)
  namjerno ostaje citljiva u devu jer je taj provajder JEDINI kanal
  isporuke u razvoju (nema stvarnog SMS-a za usporediti) — potpuno
  maskiranje bi ga ucinilo beskorisnim za lokalno debugiranje.
- **Test "service_role kljuc nikad u klijentskom kodu"**
  (`src/lib/no-service-role-in-client.test.ts`): umjesto custom ESLint
  pravila, Vitest test skenira sve `"use client"` datoteke i provjerava da
  nijedna ne referencira `SUPABASE_SERVICE_ROLE_KEY` niti uvozi
  `supabase/admin`. `src/lib/supabase/admin.ts` dodatno ima
  `import "server-only"` koji baca build-time gresku ako se ikad ubaci u
  klijentski bundle — dvostruka zastita.
- **Leaked password protection nije ukljucen preko migracije**: to je
  Supabase Auth projekt-razine postavka (HaveIBeenPwned provjera), nema
  odgovarajuci Supabase MCP poziv za nju (samo dashboard/Management API).
  Ostaje kao poznato ogranicenje/rucni korak — vidi README.
- **Sigurnosni/performance advisori na kraju Faze 6** (cloud projekt):
  preostala upozorenja su sva svjesno prihvacena/dokumentirana ranije —
  `rls_enabled_no_policy` (namjerno, service_role-only tablice),
  `extension_in_public` za pg_net (ne moze se premjestiti),
  `authenticated_security_definer_function_executable` za
  `auth_role`/`auth_store_id` (namjerni izuzetak za RLS helper funkcije),
  `auth_leaked_password_protection` (rucni korak), i INFO-level
  `unused_index` (ocekivano na gotovo praznoj dev bazi).

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

## Redizajn i post-launch popravci (2026-09-21)

- **Vizualni redizajn**: default shadcn siva paleta zamijenjena
  narancastom brend bojom + toplim neutralnim tonovima (`globals.css`),
  Card dobio realnu sjenu/border. Usput otkriven i popravljen pravi bug:
  `--font-sans: var(--font-sans)` kruzna referenca u `globals.css` je
  cinila da citava app tiho pada na browserov default (serif) font
  umjesto ucitanog Geist Sans-a.
- **`Select` (`@base-ui/react/select`) prikazivao sirovi `value` umjesto
  labela** (npr. UUID usluge u brzom unosu, broj slotova umjesto "60
  min"): Base UI-jev `<Select.Value>` po defaultu ispisuje sirovu
  vrijednost osim ako se root `<Select>` ne opskrbi `items` propom
  (`Record<string, ReactNode>` mapa value->label) ili `<SelectValue>`
  ne dobije render-funkciju kao children. Popravljeno dodavanjem `items`
  na sva tri mjesta koja koriste `Select` (brzi unos, trajanje usluge,
  filter radionice/grupiranje u statistici).
- **`/admin` raspored**: native `<input type="date">` (ruzan
  browser-nativni picker) zamijenjen nasim stiliziranim `Calendar`
  komponentom kao pocetnim prikazom; klik na datum prebacuje na dnevni
  raspored (isti prikaz kao prije).
- **Dnevna pauza (rucak) po danu u tjednu**: dodani `break_start`/
  `break_end` (nullable `time`) stupci na `store_hours` (migracije
  `store_hours_break`, `fn_availability_break`), s check-constraintima
  (poravnato na 30 min, par, unutar radnog vremena). `get_availability()`
  sad tretira celije unutar pauze kao potpuno zauzete (isti mehanizam
  kao `slot_blocks`, ali po tjednom danu umjesto apsolutnog datuma).
  Admin postavke UI: opcionalni prekidac "Pauza" po danu s dva time
  inputa, defaultira na 12:00-12:30 kad se ukljuci.
- **RPC pozivi s `null` za "opcionalni" uuid/text parametar** (npr.
  `store_stats(p_store_id)` = null znaci "sve radionice",
  `create_booking(p_name/p_phone)` = null za walk-in bez podataka):
  Supabase-generirani tipovi za RPC `Args` ne markiraju takve parametre
  kao `| null` (samo parametri s defaultom dobiju `?:`), iako ih
  Postgres na SQL razini uvijek prima kao nullable. Postojeci pozivi u
  `admin/actions.ts` i `super/actions.ts` su zato od regeneracije tipova
  (nakon migracije pauze) trebali `null as unknown as string` cast —
  namjeran, ne mijenja runtime ponasanje, samo zaobilazi netocnu
  strogost generatora.
- **`license_plate` postao opcionalan**: brzi unos (admin, telefonska/
  walk-in rezervacija) cesto nema oznaku u trenutku zapisa, pa je
  `bookings.license_plate` prebacen s `not null` na nullable (+
  `bookings_plate_format` dopusta null). `create_booking` dobio je i
  `p_notes` parametar (stupac `notes` je postojao u shemi ali se nigdje
  nije pisao). Online booking flow (`/r/[slug]`) i dalje trazi oznaku na
  razini forme/Zod validacije — DB samo vise ne nameci to globalno. Kad
  oznake nema, admin raspored i `BookingRow` prikazuju ime klijenta
  umjesto oznake; `build_sms_body` CONFIRMATION poruka ima granu bez
  oznake.
- **`stores.slot_minutes` sad dopusta 15 ili 30** (bio fiksno `= 30`):
  trebalo je da trajanje usluge moze biti npr. 45 min (nije visekratnik
  30). Demo radionica je rucno prebacena na 15 min grid, a
  `store_services.slots` za postojece usluge udvostrucen da stvarno
  trajanje ostane isto (Gume na felgama i dalje 30 min, Premontiravanje
  60 min). Nove radionice i dalje defaultiraju na 30 (stupac default
  nepromijenjen). UI za trajanje usluge (`ServicesCard`) sad je broj-input
  u minutama koji se na blur zaokruzuje na najblizi visekratnik
  `slot_minutes`, umjesto padajuceg izbornika s fiksnim opcijama.
- **`/login` split-screen s uzivo pregledom `/r/demo` u iframeu** (lijevo
  "kako izgleda klijentu", desno forma): ovo je zahtijevalo popustanje
  dva razlicita sigurnosna headera koja bi inace blokirala iframe na
  ISTOM originu — `X-Frame-Options: DENY` u `next.config.ts` (dodano
  `SAMEORIGIN` pravilo specificno za `/r/:path*`, primjenjuje se nakon
  opceg DENY pravila pa ga override-a samo za tu putanju) i
  `frame-ancestors 'none'` u CSP-u (`src/proxy.ts`, sad `'self'` samo za
  `/r/*` puteve — `frame-ancestors` u modernim browserima nadjacava
  `X-Frame-Options` pa je popustanje jednog bez drugog nedovoljno).
  `/admin` i `/super` ostaju potpuno zasticeni (DENY / 'none').
- **Deploy na Vercel preko GitHuba, ne inline upload**: projekt vec ima
  lokalni git repo (od ranijih Faza), pa je najisplativije bilo
  `gh repo create --push` (privatni repo `nacka301/vulkanizerske-radnje`)
  i zatim `create_git_project` + `create_deployment` s `gitSource` — Vercel
  server sam povlaci kod, umjesto da se stotinjak fajlova (~700 KB izvora)
  salje inline kroz MCP poziv (nepotrebno skupo tokenski i blizu limita
  velicine poziva). Vercel projekt: `vulkanizerske-radnje-app` (team
  `vaki`), SSO/deployment protection namjerno iskljucen (`ssoProtection:
  null`) da link bude javno dostupan bez Vercel logina. `APP_BASE_URL`
  (Vercel env) i `app_settings.app_base_url` (Supabase) rucno usklajeni na
  stvarnu produkcijsku domenu nakon prvog deploya.
- **SMS provajder zamijenjen: Twilio -> Infobip**: Twilio trial racun
  blokira i SMS i pozivnu verifikaciju brojeva za Hrvatsku ("restricted
  country"), pa realno testiranje s hrvatskim brojem na trialu nije bilo
  moguce. `TwilioSmsProvider` obrisan, dodan `InfobipSmsProvider` (isto
  `SmsProvider` sucelje, `POST {base_url}/sms/2/text/advanced`,
  `Authorization: App {api_key}`, baca gresku na `status.groupName ===
  'REJECTED'`). `resolveProvider()` u `sms-worker/index.ts` sad grana na
  `sms_provider = 'infobip'` i cita `infobip_base_url`/`infobip_api_key`
  iz `app_settings` (isti obrazac kao prije, samo drugi kljucevi).
  `app_settings.sms_provider` vracen na `'console'` dok korisnik ne da
  prave Infobip kredencijale. Deploy Edge Functiona ovaj put nije isao
  preko Supabase MCP `deploy_edge_function` alata — taj alat u ovoj sesiji
  dosljedno vraca `files: expected array, received string` (generi cka,
  prazna shema alata `{"type":"object"}`, izgleda kao serijalizacijski bug
  za ovaj konkretni alat) — nego preko `supabase functions deploy
  sms-worker --no-verify-jwt` (CLI, vec ulogiran). Ispisuje "WARNING:
  Docker is not running" ali svejedno uspijeva (upload preko API-ja, ne
  treba lokalni bundler) — CLI `functions deploy` nije isto sto i
  `supabase start`, ne krsi pravilo "nema lokalnog Dockera".
- **KRITICNI bug: `/login` bio statically prerenderiran u produkciji ->
  sav JS blokiran CSP-om** (gumbi "Popuni"/"Prijavi se" doslovno nisu
  radili, bez vidljive greske korisniku, samo u browser konzoli). Next.js
  po defaultu statiki predrenderira stranice koje ne koriste dinamicke
  API pozive; `proxy.ts` generira nov CSP nonce za SVAKI zahtjev, ali
  staticki HTML ima nonce fiksiran u build-timeu — u produkciji se ta dva
  nikad ne poklapaju, pa `strict-dynamic` CSP blokira bas sve skripte
  (ukljucujuci Next-ovu vlastitu hidraciju). U `next dev` se ovo ne vidi
  jer dev server uvijek renderira dinamicki, pa je bug preživio cijelu
  sesiju lokalnog testiranja i tek se pojavio na Vercelu. Popravljeno
  dodavanjem `export const dynamic = "force-dynamic"` na `/login` i
  `/privatnost` (jedine preostale staticke stranice s klijentskim JS-om;
  `/` ostaje staticka jer samo radi `redirect()` bez ikakve interakcije).
  **Pravilo ubuduce**: svaka nova stranica koja renderira interaktivne
  client komponente mora imati `dynamic = "force-dynamic"` osim ako je
  vec dinamicka po drugoj osnovi (cita cookies/headers/searchParams),
  inace CSP nonce prekine JS bez ijedne vidljive greske u UI-ju.

## Selidba baze na drugi Supabase account (2026-10-11)

- Stari projekt `vulkanizerske-radnje` (ref `xwobgzzplievhlphjuox`) je
  pauziran jer besplatni plan dopusta samo 2 aktivna projekta po accountu.
  Baza je prebacena na novi projekt `nacka298_vulkanizeri` (ref
  `bckmjvnjalvjkojpqmmx`, eu-west-1) u drugom Supabase accountu.
- Podaci nisu preseljeni iz stare baze — u njoj su bili samo demo podaci.
  Nova baza je izgradjena iz repoa: svih 20 migracija + `seed.sql`
  (poslano preko Management API `/database/query` jer CLI iz korisnikovog
  PowerShella nije mogao doseci api.supabase.com), `sms-worker` deployan
  s `supabase functions deploy --project-ref`, demo admin i super admin
  kreirani preko GoTrue admin API-ja, `app_settings` (app_base_url,
  Infobip) upisan rucno, fake rezervacije seedane relativno na danasnji
  datum.
- `sms_worker_url` u migraciji `20260921110100_sms_worker_cron.sql` sada
  pokazuje na novi projekt ref. **Pravilo ubuduce**: kod svake nove
  selidbe projekta taj URL (i `app_settings.sms_worker_url`) se mora
  promijeniti, inace pg_cron zove staru funkciju.
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` i
  `SUPABASE_SERVICE_ROLE_KEY` na Vercelu moraju pokazivati na novi projekt.
