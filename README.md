# Vulkanizerske radnje — online rezervacije

Multi-tenant SaaS za rezervaciju termina zamjene guma u vulkanizerskim
radionicama. Vidi [`claude-code-prompt.md`](./claude-code-prompt.md) za punu
specifikaciju i [`DECISIONS.md`](./DECISIONS.md) za odluke koje nisu bile
eksplicitno propisane.

## Stack

Next.js (App Router, TypeScript strict) + Tailwind + shadcn/ui, Supabase
(Postgres, Auth, RLS, Realtime, pg_cron, pg_net, Edge Functions), Vercel.

## Preduvjeti

- Node.js 20+, [pnpm](https://pnpm.io/) 9+
- Supabase projekt. Dvije opcije:
  - **Cloud (default za ovaj repo)** — projekt je vec kreiran preko
    Supabase MCP-a (vidi ispod), nije potreban Docker.
  - **Lokalno** — [Docker Desktop](https://www.docker.com/products/docker-desktop/)
    + [Supabase CLI](https://supabase.com/docs/guides/cli), `supabase start`.

## Supabase projekt

Za ovaj repo koristi se **cloud Supabase projekt** `vulkanizerske-radnje`
(ref `xwobgzzplievhlphjuox`, eu-central-1), a ne lokalni Docker stack —
lokalni Docker Desktop na razvojnom stroju je bio nestabilan (poznat bug s
"Inference manager" servisom), pa je Faza 1 verificirana izravno nad cloud
projektom preko Supabase MCP alata (`apply_migration`/`execute_sql`), ne
preko `supabase start`. Migracije u `supabase/migrations/` ostaju izvor
istine i mogu se jednako primijeniti na lokalni stack ako Docker proradi
(`supabase link --project-ref xwobgzzplievhlphjuox && supabase db push`,
ili `supabase start` + `supabase db reset` za potpuno lokalan rad).

```bash
pnpm install

cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL i NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY su vec
# poznati (vidi gore); SUPABASE_SERVICE_ROLE_KEY pokupi iz Supabase
# dashboarda projekta (Project Settings -> API -> service_role) — MCP alat
# namjerno ne izlaze taj kljuc.

pnpm dev
```

### Migracije i seed

Migracije žive u `supabase/migrations/` (primijenjene na cloud projekt preko
MCP-a tijekom Faze 1). `supabase/seed.sql` sadrži jednu demo radionicu (vec
ubacenu u cloud projekt).

Za lokalni Docker stack: `supabase start` + `supabase db reset` primjenjuje
iste migracije i seed automatski.

### Testovi

```bash
pnpm test              # vitest — čista logika (normalizacija, SMS predlošci, dostupnost, vremenske zone)
pnpm test:concurrency  # skripta nad Supabaseom (treba SUPABASE_SERVICE_ROLE_KEY) — provjerava da se isti termin ne moze dvostruko rezervirati
pnpm test:rls          # skripta nad Supabaseom (treba SERVICE_ROLE_KEY + ANON_KEY) — provjerava RLS izolaciju
```

`pnpm test:concurrency` i `pnpm test:rls` su vec ručno ekvivalentno
verificirani za Fazu 1 izravno preko Supabase MCP-a (20 paralelnih
`execute_sql` poziva umjesto Node skripte, jer service_role ključ nije bio
dostupan u toj sesiji) — vidi git log poruku Faze 1 i `DECISIONS.md`. Kad
`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_ANON_KEY` postoje u env-u, ove skripte
rade identičnu provjeru automatizirano.

### Demo prijava (Faza 4)

Demo store_admin racun za radionicu `demo`, kreiran izravno u `auth.users`
(vidi DECISIONS.md):

- URL: `/login`
- E-mail: `admin@demo.vulkanizer.hr`
- Zaporka: `xjXTxCD6BCVH`

### Rucna provjera Faze 4 (dashboard radionice)

1. Prijavi se na `/login` demo racunom (gore) — treba te odvesti na `/admin`.
2. `/admin`: napravi rezervaciju preko `/r/demo` u drugom tabu i provjeri da
   se pojavi bez osvjezavanja (Realtime), sa zvukom i isticanjem retka.
3. Isprobaj "Brzi unos", "Odrađeno"/"Nije došao"/"Otkaži"/"Pomakni" na retku.
4. `/admin/postavke`: promijeni radno vrijeme, broj dizalica, ukljuci/
   iskljuci uslugu, dodaj i obrisi blokadu.
5. Odjava vraca na `/login`; pokusaj otvoriti `/admin` bez prijave — treba
   preusmjeriti na `/login`.

### Rucna provjera Faze 2 (klijentski tok)

`pnpm build`/`tsc`/`lint`/`vitest` prolaze, ali stvarni `pnpm dev` +
pregledavanje `/r/demo` nije pokrenuto u ovoj sesiji (nedostajao je
`SUPABASE_SERVICE_ROLE_KEY` — vidi DECISIONS.md). Nakon sto postavis
`.env.local` provjeri:

1. `/r/demo` — odaberi uslugu, termin (odbrojavanje od 3 min), upisi
   podatke, potvrdi rezervaciju (bez pravih Turnstile kljuceva captcha je
   razvojni mock koji automatski prolazi).
2. Ekran potvrde prikazuje registraciju/datum/vrijeme/adresu i poveznicu na
   `/r/demo/b/[token]`.
3. Na `/r/demo/b/[token]` otkazi termin i provjeri da status postane
   "Otkazano".
4. `/privatnost` se ucitava.

### SMS worker (Faza 3)

`supabase/functions/sms-worker` je deployan na cloud projekt preko Supabase
MCP-a (`verify_jwt: false` — vlastita autentifikacija preko `x-worker-secret`,
usporedjenog u konstantnom vremenu s `app_settings.worker_secret`).
`pg_cron` ga poziva svake minute preko `pg_net.http_post` (migracija
`20260921110100_sms_worker_cron.sql`). Provjereno end-to-end preko `curl`-a:
uspjesno slanje (`SENT` + `provider_message_id`), pogresna tajna (`401`), i
retry/backoff do `FAILED` nakon 3 pokusaja (namjerno neispravni Twilio
podaci, ocisceno nakon testa) — vidi DECISIONS.md.

Provjera SMS logova (ConsoleSmsProvider ispisuje u Edge Function log):
Supabase dashboard -> Edge Functions -> sms-worker -> Logs.

## Faze razvoja

Vidi `claude-code-prompt.md` poglavlje 10. Status faza:

- [x] Faza 0 — temelj
- [x] Faza 1 — jezgra (baza, SQL funkcije, konkurentnost)
- [x] Faza 2 — klijentski tok rezervacije
- [x] Faza 3 — SMS
- [x] Faza 4 — dashboard radionice
- [ ] Faza 5 — super admin
- [ ] Faza 6 — završna provjera

## Poznata ograničenja

Popunjava se u Fazi 6.
