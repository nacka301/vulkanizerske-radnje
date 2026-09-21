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
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (za
  lokalni Supabase)
- [Supabase CLI](https://supabase.com/docs/guides/cli)

## Lokalni razvoj

```bash
pnpm install

# pokreni lokalni Supabase (Postgres, Auth, Studio, Edge Functions runtime...)
supabase start

# supabase start ispisuje API URL i kljuceve — prepisi ih u .env.local
cp .env.example .env.local
# uredi .env.local: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
# SUPABASE_SERVICE_ROLE_KEY (iz "supabase start" outputa)

pnpm dev
```

Aplikacija je na http://localhost:3000, Supabase Studio na
http://localhost:54323 (portovi po `supabase/config.toml`).

### Migracije i seed

Migracije žive u `supabase/migrations/`, primjenjuju se automatski na
`supabase start` / `supabase db reset`. `supabase/seed.sql` sadrži jednu demo
radionicu.

```bash
supabase db reset   # briše lokalnu bazu, ponovno primjenjuje migracije + seed
```

### Testovi

```bash
pnpm test              # vitest — čista logika (normalizacija, SMS predlošci, dostupnost, vremenske zone)
pnpm test:concurrency  # skripta nad lokalnim Supabaseom (supabase start mora biti pokrenut) — provjerava da se isti termin ne moze dvostruko rezervirati
```

## Faze razvoja

Vidi `claude-code-prompt.md` poglavlje 10. Status faza:

- [x] Faza 0 — temelj
- [ ] Faza 1 — jezgra (baza, SQL funkcije, konkurentnost)
- [ ] Faza 2 — klijentski tok rezervacije
- [ ] Faza 3 — SMS
- [ ] Faza 4 — dashboard radionice
- [ ] Faza 5 — super admin
- [ ] Faza 6 — završna provjera

## Poznata ograničenja

Popunjava se u Fazi 6.
