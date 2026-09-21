# Vulkanizerske radnje — online rezervacije

Multi-tenant SaaS za rezervaciju termina zamjene guma u vulkanizerskim
radionicama. Vidi [`claude-code-prompt.md`](./claude-code-prompt.md) za punu
specifikaciju i [`DECISIONS.md`](./DECISIONS.md) za odluke koje nisu bile
eksplicitno propisane.

## Stack

Next.js 16 (App Router, TypeScript strict) + Tailwind v4 + shadcn/ui,
Supabase (Postgres, Auth, RLS, Realtime, pg_cron, pg_net, Edge Functions),
Vercel.

## Trenutni Supabase projekt

Repo je povezan s cloud Supabase projektom **`vulkanizerske-radnje`**
(ref `xwobgzzplievhlphjuox`, eu-central-1) — vidi "Zasto cloud, ne lokalni
Docker" ispod. Sve migracije iz `supabase/migrations/` su vec primijenjene
na taj projekt, `sms-worker` Edge Function je deployana, `pg_cron` poslovi
su aktivni.

```bash
pnpm install
cp .env.example .env.local
```

Popuni `.env.local`:

- `NEXT_PUBLIC_SUPABASE_URL=https://xwobgzzplievhlphjuox.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_6pynjolMFyrhpF9KfHF2tQ_efuB5oai`
- `SUPABASE_SERVICE_ROLE_KEY=` — pokupi iz Supabase dashboarda
  (Project Settings → API Keys → service_role → "reveal"). MCP alati koji su
  koristeni za izgradnju ovog repoa namjerno ne izlazu taj kljuc.

```bash
pnpm dev
```

### Demo prijave

| Uloga | E-mail | Zaporka |
|---|---|---|
| store_admin (radionica `demo`) | `admin@demo.vulkanizer.hr` | `xjXTxCD6BCVH` |
| super_admin | `super@demo.vulkanizer.hr` | `A00ktSSSh8ug` |

Zamijeni ove zaporke prije bilo kakvog produkcijskog koristenja.

## Postavljanje od nule (novi Supabase projekt)

1. **Supabase projekt**: kreiraj novi projekt (dashboard ili
   `supabase projects create`), zabiljezi `ref`, URL i kljuceve.
2. **Migracije**: `supabase link --project-ref <ref>` pa
   `supabase db push` (primjenjuje sve iz `supabase/migrations/` redom).
   Ili rucno kroz SQL editor/MCP `apply_migration` za svaku datoteku
   redom po nazivu (vec sadrze timestamp prefiks).
3. **Seed**: `supabase db push` ne pokrece `seed.sql` automatski na
   udaljenom projektu — pokreni rucno (`psql < supabase/seed.sql` ili
   zalijepi u SQL editor) da dobijes katalog usluga i demo radionicu.
4. **`app_settings` konfiguracija** — nakon migracija azuriraj:
   ```sql
   update app_settings set value = 'https://<tvoja-domena>' where key = 'app_base_url';
   update app_settings set value = '<novi-nasumicni-secret>' where key = 'worker_secret';
   update app_settings set value = 'https://<ref>.supabase.co/functions/v1/sms-worker' where key = 'sms_worker_url';
   -- za Twilio umjesto console providera:
   update app_settings set value = 'twilio' where key = 'sms_provider';
   insert into app_settings (key, value) values ('twilio_account_sid','...'), ('twilio_auth_token','...')
     on conflict (key) do update set value = excluded.value;
   ```
   (Razlog zasto konfiguracija ide preko `app_settings`, a ne Edge Function
   secreta, vidi DECISIONS.md "Faza 3".)
5. **Edge Function**: `supabase functions deploy sms-worker --no-verify-jwt`
   (funkcija ima vlastitu `x-worker-secret` autentifikaciju).
6. **pg_cron**: vec zakazan migracijom `20260921110100_sms_worker_cron.sql`
   (svaka minuta) + `20260921100800_cron_cleanup.sql` (ciscenje holdova/GDPR).
   Provjeri: `select * from cron.job;`.
7. **Realtime**: migracija `20260921120000_enable_realtime_bookings.sql`
   vec dodaje `bookings` u `supabase_realtime` publikaciju.
8. **Auth**: u dashboardu (Authentication → Sign In / Providers) ostavi samo
   Email/Password. Preporuceno: Authentication → Policies → ukljuci "Leaked
   password protection" (nije postavljeno preko migracije — Supabase
   security advisor to javlja kao upozorenje, vidi "Poznata ogranicenja").
9. **Turnstile**: registriraj site na Cloudflareu, postavi
   `NEXT_PUBLIC_TURNSTILE_SITE_KEY`/`TURNSTILE_SECRET_KEY`. Bez njih
   aplikacija radi s razvojnim mockom (vidi DECISIONS.md).
10. **Vercel**: importaj repo, postavi sve env varijable iz
    `.env.example` (uklj. `APP_BASE_URL` = konacna domena), deploy.
    Sigurnosni headeri (CSP, X-Frame-Options...) su vec u
    `next.config.ts`, ne treba dodatna Vercel konfiguracija.

### Lokalni Docker stack (alternativa cloudu)

```bash
supabase start   # Postgres, Auth, Studio, Edge Functions runtime lokalno
supabase db reset  # primjenjuje migracije + seed.sql
```

Azuriraj `.env.local` s lokalnim URL-om/kljucevima (ispisuju se nakon
`supabase start`) i `app_settings.sms_worker_url` na
`http://127.0.0.1:54321/functions/v1/sms-worker`.

## Testovi

```bash
pnpm test              # vitest — cista logika (normalizacija, SMS predlosci, celije, DST, service-role izolacija)
pnpm lint
pnpm exec tsc --noEmit
pnpm build
pnpm test:concurrency  # skripta nad Supabaseom (treba SUPABASE_SERVICE_ROLE_KEY) — konkurentnost rezervacija
pnpm test:rls          # skripta nad Supabaseom (treba SERVICE_ROLE_KEY + ANON_KEY) — RLS izolacija
```

`pnpm test:concurrency`/`pnpm test:rls` su vec rucno ekvivalentno
verificirani izravno preko Supabase MCP-a (nedostajao je service_role kljuc
u sesiji koja je gradila repo) — 20 paralelnih `execute_sql` poziva umjesto
Node skripte za konkurentnost, simulirane `authenticated`/`anon` sesije za
RLS. Detalji i rezultati u git log porukama Faza 1/3 i `DECISIONS.md`. Kad
imas kljuceve u `.env.local`, ove skripte rade istu provjeru automatizirano.

## Rucni scenariji za provjeru (poglavlje 9)

1. **Rezervacija + SMS**: `/r/demo` → odaberi uslugu → termin (3-min
   odbrojavanje) → podaci (captcha je dev-mock bez pravih Turnstile
   kljuceva) → potvrda prikazuje registraciju/datum/vrijeme/adresu i link
   na `/r/demo/b/[token]`. U `/admin` se redak pojavi odmah (Realtime,
   zvuk, isticanje). SMS log: Supabase dashboard → Edge Functions →
   sms-worker → Logs (ConsoleSmsProvider ispisuje umjesto slanja).
2. **Konkurentnost**: vidi `pnpm test:concurrency` gore — vec potvrdjeno
   preko MCP-a (bays=1 → 1 uspjeh/19 SLOT_TAKEN, bays=2 → 2/18).
3. **Hold istice**: odaberi termin na `/r/demo`, pricekaj 3 min bez
   potvrde — vrati se na odabir termina s porukom, termin opet slobodan.
4. **"Nije dosao" oslobadja slot**: u `/admin` klikni "Nije dosao" na
   buducoj rezervaciji, provjeri da se termin ponovno pojavi kao slobodan
   na `/r/demo`.
5. **Klijent otkaze**: `/r/demo/b/[token]` → "Otkazi termin" → status
   postaje "Otkazano", eventualni PENDING podsjetnik u `sms_outbox`
   prelazi u `CANCELLED` (vidi tablicu u Supabase Studiju).
6. **Izolacija radionica**: prijavi se kao store_admin radionice A,
   pokusaj otvoriti podatke radionice B izravno kroz Supabase klijent
   (browser DevTools) ili preko server akcije s tudjim `storeId` — RLS/
   `requireStoreAdmin()` sprjecavaju pristup (vec dokazano u Fazi 1 preko
   simuliranih sesija, vidi DECISIONS.md).

Dodatno specificno za ovaj repo (Faza 4/5), vidi i:

- `/admin/postavke`: radno vrijeme, broj dizalica, usluge, blokade.
- `/super`: popis radionica sa statistikom, kreiranje radionice (live
  provjera sluga), kreiranje admina (privremena zaporka), QR
  (SVG/PNG/A5 ispis), `/super/statistika` s filterima.

## Faze razvoja

Vidi `claude-code-prompt.md` poglavlje 10.

- [x] Faza 0 — temelj
- [x] Faza 1 — jezgra (baza, SQL funkcije, konkurentnost)
- [x] Faza 2 — klijentski tok rezervacije
- [x] Faza 3 — SMS
- [x] Faza 4 — dashboard radionice
- [x] Faza 5 — super admin
- [x] Faza 6 — zavrsna provjera

## Poznata ogranicenja

- **Docker Desktop nije koristen za razvoj** — lokalni Docker na razvojnom
  stroju je bio u trajno pokvarenom stanju (vidi DECISIONS.md, Faza 1).
  Repo je u potpunosti kompatibilan s `supabase start` (migracije su
  standardne), ali nije lokalno testiran tim putem u ovoj sesiji.
  `pnpm dev` + stvarno pregledavanje u pregledniku (Faze 2-5) takodjer
  nije pokrenuto u ovoj sesiji jer `SUPABASE_SERVICE_ROLE_KEY` nije bio
  dostupan — korisnik je preuzeo rucno testiranje. Sve je verificirano
  preko `tsc`/`lint`/`build`/`vitest` i izravnih SQL/`curl` provjera nad
  cloud projektom.
- **Twilio nije stvarno testiran** (nema pravih kredencijala) — testiran
  je samo error-path (retry/backoff) s namjerno pogresnim podacima.
  `TwilioSmsProvider` implementira dokumentirani Twilio REST API poziv, ali
  stvarna isporuka SMS-a nije potvrdjena.
- **E-mail poziv admina nije implementiran** — spec spominje "poziv
  emailom ili privremena zaporka"; buduci da SMTP provajder nije
  konfiguriran, `/super` prikazuje samo privremenu zaporku jednokratno u
  sucelju (super_admin je mora rucno proslijediti).
- **Leaked password protection nije ukljucen** — Supabase Auth postavka
  (HaveIBeenPwned provjera), nije dio migracije jer nema odgovarajuci MCP
  poziv; ukljuci rucno u dashboardu (vidi korak 8 gore).
- **`pg_net` ekstenzija ostaje u `public` shemi** — Supabase security
  advisor to javlja, ali `ALTER EXTENSION ... SET SCHEMA` nije podrzan za
  pg_net (vidi DECISIONS.md, Faza 1).
- **`sms_worker_url` u `app_settings` je hardkodiran na trenutni cloud
  projekt** — treba rucno azurirati za novi projekt ili lokalni stack
  (vidi korak 4/lokalni Docker odjeljak gore).
- **Nema automatskog produkcijskog deploya** — Vercel/domensko povezivanje
  nije izvedeno u ovoj sesiji (spec: "Deploy radi tek kad ti to izricito
  zatrazim").
- **Timezone picker je slobodan tekst** u `/super` formi (default
  "Europe/Zagreb"), ne IANA-zone dropdown — dovoljno za hrvatsko trziste
  iz MVP opsega.
- **SMS predlosci mogu premasiti 160 znakova/jedan segment za vrlo duga
  imena radionica/slugove** — testirano na realisticnim (kratkim)
  vrijednostima (vidi `src/lib/sms/templates.test.ts` i DECISIONS.md);
  nema automatskog skracivanja imena radionice u predlosku.
- **`booking_events.actor` za telefonske/walk-in rezervacije** biljezi
  `'system'`, ne konkretnog administratora — `create_booking` SQL funkcija
  (poglavlje 5) nema `p_actor` parametar u specifikaciji.
