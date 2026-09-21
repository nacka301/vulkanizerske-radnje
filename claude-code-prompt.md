# Zadatak: MVP platforma za online rezervaciju termina kod vulkanizera

Ti si glavni developer. Izgradi cijeli MVP prema ovom dokumentu, fazu po fazu. Radi samostalno, pitaj samo ako si stvarno blokiran (npr. nedostaje tajni ključ). Nakon svake faze pokreni testove, napravi git commit s jasnom porukom i kreni na sljedeću. Ne izmišljaj API ključeve, koristi `.env.example` i mock implementacije.

Ovaj dokument je jedini izvor istine. Ako nešto nije navedeno, odaberi najjednostavnije rješenje i zapiši odluku u `DECISIONS.md`.

---

## 1. Proizvod

Multi-tenant SaaS: vulkanizerske radionice dobivaju vlastiti link/QR preko kojeg klijenti (bez prijave) rezerviraju 30-minutne termine za zamjenu guma. Radionica upravlja rasporedom na tabletu. Cilj: manje telefonskih poziva tijekom sezone (travanj, listopad/studeni) i manje nedolazaka.

Tri uloge:

| Uloga | Pristup | Što radi |
|---|---|---|
| `super_admin` | login (email + zaporka) | Kreira radionice i njihove admine, generira link/QR, vidi statistiku svih radionica. |
| `store_admin` | login | Vidi i upravlja rasporedom samo svoje radionice, unosi telefonske narudžbe, postavlja radno vrijeme i blokade. |
| klijent | bez računa, link `/r/[slug]` | Bira uslugu, termin, unosi podatke, dobiva SMS. |

Sučelje je na hrvatskom. Svi tekstovi idu u `src/messages/hr.ts` (nema hardkodiranih stringova u komponentama).

**Izvan opsega MVP-a:** plaćanje, korisnički računi za klijente, email obavijesti klijentima, WhatsApp, više jezika, sinkronizacija s Google Kalendarom, cjenik, upravljanje radnicima, "hotel za gume".

---

## 2. Stack (fiksno)

- **Next.js** (najnovija stabilna verzija, App Router), **TypeScript** (strict), **Tailwind CSS**, **shadcn/ui**
- **Supabase**: Postgres, Auth, RLS, Realtime (samo za admin dashboard), `pg_cron`, `pg_net`, Edge Functions
- **Vercel** za hosting Next.js aplikacije
- **pnpm**, **zod** za validaciju, **libphonenumber-js**, **date-fns** + **@date-fns/tz**, **qrcode** (generiranje QR-a), **Cloudflare Turnstile** (captcha)
- Testovi: **Vitest** (čista logika), plus skripta za test konkurentnosti nad lokalnim Supabaseom
- Lokalni razvoj: Supabase CLI (`supabase start`), migracije u `supabase/migrations/`, `supabase/seed.sql` s jednom demo radionicom
- Render se NE koristi.

Env varijable (dokumentiraj u `.env.example`):

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # samo server, nikad u klijentski kod
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
SMS_PROVIDER=console              # console | twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
SMS_SENDER_ID=Vulkanizer
APP_BASE_URL=http://localhost:3000
WORKER_SECRET=                    # dijele pg_cron i Edge Function
```

---

## 3. Ključne arhitekturne odluke

1. **Sva poslovna logika rezervacija živi u Postgresu** (funkcije), ne u Next.js kodu. Aplikacija samo poziva funkcije.
2. **Anon korisnik nema nikakav izravan pristup tablicama.** RLS uključen na svim tablicama, za `anon` nema policyja. Javni tok ide preko Next.js route handlera/server actiona koji koriste service role ključ i pozivaju SQL funkcije. Funkcije imaju `REVOKE EXECUTE ... FROM public, anon, authenticated` i `GRANT EXECUTE ... TO service_role`.
3. **Admin čitanje** ide izravno iz browsera preko Supabase klijenta uz RLS (`store_admin` vidi samo `store_id` iz svog `profiles` retka, `super_admin` sve). Realtime pretplata na `bookings` filtrirana po `store_id`, s pollingom svakih 15 s kao rezervom.
4. **Admin pisanje** ide isključivo preko server actiona koji: (a) provjere sesiju i ulogu, (b) `store_id` uzmu iz `profiles`, nikad iz zahtjeva, (c) pozovu SQL funkciju sa service role ključem.
5. **Vrijeme:** sve se sprema kao `timestamptz` (UTC). Zona radionice je `stores.timezone` (default `Europe/Zagreb`). Sav prikaz i sva logika "dana" računaju se u zoni radionice. Napiši testove oko prelaska na ljetno/zimsko računanje vremena (zadnja nedjelja u ožujku i listopadu).
6. **Kapacitet:** radionica ima `bays` (dizalice). Termin zauzima `slot_count` uzastopnih 30-min ćelija. Ćelija je puna kad je broj aktivnih rezervacija + aktivnih holdova + blokada ≥ `bays`.
7. **Trajanje po usluzi:** "Gume na felgama" = 1 slot (30 min), "Premontiravanje" = 2 slota (60 min) kao default. Radionica to može promijeniti u `store_services.slots`.

---

## 4. Shema baze

Napiši u migracijama; nazivi u `snake_case`, svi `id` su `uuid default gen_random_uuid()`.

**Enumi:** `booking_status` (`CONFIRMED`, `COMPLETED`, `NO_SHOW`, `CANCELLED`), `booking_source` (`ONLINE`, `PHONE`, `WALK_IN`), `sms_kind` (`CONFIRMATION`, `REMINDER`, `CANCELLATION`, `RESCHEDULE`), `sms_status` (`PENDING`, `SENDING`, `SENT`, `FAILED`, `CANCELLED`), `user_role` (`super_admin`, `store_admin`).

**`stores`**
`id`, `slug` (unique, check `^[a-z0-9-]{3,40}$`, blacklist rezerviranih riječi: `admin`, `super`, `login`, `api`, `r`), `name`, `address`, `phone` (nullable), `timezone` (default `'Europe/Zagreb'`), `bays` int default 1 (check ≥ 1), `slot_minutes` int default 30 (u MVP-u fiksno 30, check = 30), `min_lead_minutes` int default 60, `max_horizon_days` int default 60, `client_cancel_cutoff_minutes` int default 120, `require_otp` bool default false, `active` bool default true, `created_at`.

**`store_hours`**
`store_id`, `weekday` smallint (1 = ponedjeljak ... 7 = nedjelja), `open_time` time, `close_time` time, `is_closed` bool. PK `(store_id, weekday)`. Radno vrijeme mora biti poravnato na 30 min (check ili validacija).

**`slot_blocks`** (godišnji odmor, praznici, privremeno zatvaranje)
`id`, `store_id`, `starts_at`, `ends_at`, `reason`, `created_at`. Blok koji preklapa ćeliju čini je punom (zauzima sve dizalice).

**`services`** (globalni katalog, seed s dva retka)
`id`, `code` (`TIRES_ON_RIMS`, `TIRE_REMOUNT`), `name` ("Gume na felgama", "Premontiravanje"), `default_slots` (1, 2). Balansiranje je uključeno u obje usluge i ne postoji zasebno.

**`store_services`**
`store_id`, `service_id`, `slots` int (check 1..8), `enabled` bool. PK `(store_id, service_id)`. Kod kreiranja radionice automatski se dodaju oba retka s default vrijednostima.

**`profiles`**
`id` (FK na `auth.users`, on delete cascade), `role`, `store_id` (nullable, FK). Check: `role = 'super_admin' OR store_id IS NOT NULL`.

**`bookings`**
`id`, `store_id`, `service_id`, `license_plate` (normalizirano, vidi dolje), `client_name` (nullable), `client_phone` (nullable, E.164), `start_time`, `end_time`, `slot_count`, `status` default `CONFIRMED`, `source`, `manage_token` (unique, 32 slučajna bajta, base64url), `notes` (nullable), `created_at`, `updated_at`, `status_changed_at`. Checkovi: `end_time > start_time`; `source <> 'ONLINE' OR (client_name IS NOT NULL AND client_phone IS NOT NULL)`. Indeksi: `(store_id, start_time)`, `(store_id, status, start_time)`, `(manage_token)`.

**`slot_holds`**
`id`, `store_id`, `service_id`, `start_time`, `end_time`, `expires_at` (now() + 3 min), `created_at`. Aktivan hold je onaj s `expires_at > now()`.

**`sms_outbox`**
`id`, `booking_id` (nullable FK), `kind`, `to_phone`, `body`, `status` default `PENDING`, `scheduled_at`, `attempts` int default 0, `provider_message_id`, `error`, `sent_at`, `created_at`. Indeks `(status, scheduled_at)`.

**`booking_events`** (audit)
`id`, `booking_id`, `event` (tekst: `created`, `completed`, `no_show`, `cancelled`, `rescheduled`, `client_cancelled`), `actor` (uuid korisnika ili `client`/`system`), `data` jsonb, `at`.

### Normalizacija (implementiraj i u TS i u SQL provjeri)
- **Registracija:** velika slova, ukloni sve osim `A-Z0-9`, duljina 4–10. Prikaz: ako odgovara `^([A-Z]{2})(\d{3,4})([A-Z]{1,2})$` formatiraj kao `ZG 1234-AB`, inače prikaži kako je.
- **Mobitel:** `libphonenumber-js`, default zemlja `HR`, mora biti valjan mobilni broj, sprema se kao E.164.

---

## 5. SQL funkcije (jezgra sustava)

Sve su `SECURITY DEFINER`, `set search_path = public`, `plpgsql`.

### `get_availability(p_store_id uuid, p_date date, p_service_id uuid) → table(start_time timestamptz, available boolean)`
1. Dohvati radno vrijeme za dan u tjednu (u zoni radionice). Ako je zatvoreno, vrati prazno.
2. Generiraj ćelije od 30 min od `open_time` do `close_time`.
3. Za svaku ćeliju izračunaj zauzetost = broj `bookings` sa statusom `CONFIRMED` ili `COMPLETED` koji je preklapaju + aktivni holdovi + (1 punu zauzetost ako je ćelija u nekom `slot_block`).
4. Početni termin `s` je `available` ako su sve ćelije `s ... s + slots*30 min` slobodne (zauzetost < `bays`), termin završava najkasnije u `close_time`, `s ≥ now() + min_lead_minutes` i `s ≤ now() + max_horizon_days`.

### `create_hold(p_store_id, p_service_id, p_start) → slot_holds`
Kao `create_booking` dolje, ali samo insertira hold. Baca `SLOT_TAKEN` ako termin nije slobodan.

### `create_booking(p_store_id, p_service_id, p_start, p_plate, p_name, p_phone, p_source, p_hold_id default null) → bookings`
1. Učitaj radionicu i `slots` za uslugu; izračunaj `end_time`.
2. **Zaključaj:** `pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || <lokalni datum>::text, 0))`. Rezervacija nikad ne prelazi granicu dana.
3. Unutar zaključavanja ponovno provjeri sve (radno vrijeme, poravnanje na 30 min, lead time, horizont, blokade, kapacitet svih ćelija). Holdove računaj u zauzetost, ali ignoriraj hold s `id = p_hold_id` (to je vlastiti hold klijenta); obriši ga nakon uspjeha.
4. Za `source = 'ONLINE'` primijeni limit: isti `client_phone` ne smije imati više od 3 budućih `CONFIRMED` rezervacija u istoj radionici.
5. Insertiraj `bookings` redak, `manage_token`, `booking_events`, i `sms_outbox` retke (vidi poglavlje 6).
6. Greške baci kao `RAISE EXCEPTION` s kratkim kodom: `SLOT_TAKEN`, `OUTSIDE_HOURS`, `TOO_SOON`, `TOO_FAR`, `BLOCKED`, `PHONE_LIMIT`, `STORE_NOT_FOUND`. Next.js ih mapira u hrvatske poruke.

### `set_booking_status(p_store_id, p_booking_id, p_status, p_notify boolean default false, p_actor uuid)`
Dozvoljeni prijelazi: `CONFIRMED → COMPLETED | NO_SHOW | CANCELLED`. Sve ostalo je greška `INVALID_TRANSITION`. `NO_SHOW` i `CANCELLED` oslobađaju kapacitet. Kod `CANCELLED` postavi sve `PENDING` retke u `sms_outbox` za tu rezervaciju na `CANCELLED`, a ako je `p_notify` i postoji broj, dodaj `CANCELLATION` SMS. Upiši `booking_events`.

### `reschedule_booking(p_store_id, p_booking_id, p_new_start, p_notify boolean, p_actor uuid)`
Zaključaj oba dana (novi i stari) uvijek istim redoslijedom (sortirani ključevi) da izbjegneš deadlock. Provjeri kapacitet za novi termin ne računajući samu rezervaciju. Ažuriraj `start_time`/`end_time`, otkaži stare `PENDING` SMS-ove, kreiraj nove (`RESCHEDULE` ako `p_notify`, novi `REMINDER`).

### `client_cancel_booking(p_token text)`
Nađi rezervaciju po `manage_token`; dopusti samo ako je `CONFIRMED` i vrijeme početka je barem `client_cancel_cutoff_minutes` u budućnosti, inače `CUTOFF_PASSED`. Postavi `CANCELLED`, događaj `client_cancelled`, otkaži `PENDING` SMS-ove.

### `store_stats(p_store_id uuid | null, p_from date, p_to date, p_group text)` 
Vraća brojeve po danu/mjesecu i radionici: ukupno, po statusu, po izvoru, i `no_show_rate = NO_SHOW / (COMPLETED + NO_SHOW)` (ako je nazivnik 0, `null`). Za `super_admin` dopušteno bez `p_store_id`.

### Čišćenje
- `pg_cron` svake minute: `delete from slot_holds where expires_at < now() - interval '1 minute'`. (Dostupnost ionako filtrira po `expires_at`, ovo je samo higijena.)
- `pg_cron` jednom tjedno: postavi `client_name` i `client_phone` na `NULL` za rezervacije starije od 12 mjeseci (GDPR minimizacija podataka).

---

## 6. SMS sustav

### Outbox obrazac
SMS se nikad ne šalje izravno iz zahtjeva. Funkcije upisuju retke u `sms_outbox`, a worker ih šalje.

- **Potvrda:** kod uspješnog `create_booking` s postojećim brojem telefona, `CONFIRMATION`, `scheduled_at = now()`.
- **Podsjetnik:** `REMINDER` zakazan za **dan prije termina u 18:00** po lokalnom vremenu radionice. Ako je rezervacija napravljena nakon tog trenutka (npr. isti dan), podsjetnik se ne kreira.
- Telefonski unos bez broja telefona ne šalje ništa.
- "Nije došao" ne šalje SMS. "Otkazano" šalje SMS samo ako je admin ostavio uključen checkbox "Obavijesti klijenta" (default uključen).

### Worker
Supabase Edge Function `sms-worker`, zaštićena headerom `x-worker-secret` (usporedba u konstantnom vremenu). `pg_cron` je poziva svake minute preko `pg_net.http_post`.

1. Odaberi do 50 redaka: `status = 'PENDING' AND scheduled_at <= now()` s `FOR UPDATE SKIP LOCKED`; odmah ih označi `SENDING`, `attempts + 1`.
2. Pošalji preko `SmsProvider` sučelja.
3. Uspjeh: `SENT`, spremi `provider_message_id` i `sent_at`. Neuspjeh: ako `attempts < 3` vrati u `PENDING` s `scheduled_at = now() + attempts * 2 min`, inače `FAILED` s tekstom greške.
4. Retke koji su predugo u `SENDING` (više od 5 min) vrati u `PENDING` (worker se srušio usred slanja).

### Provajder
Sučelje `SmsProvider { send(to: string, body: string, senderId: string): Promise<{ id: string }> }`. Implementiraj `ConsoleSmsProvider` (ispis u log, default za razvoj) i `TwilioSmsProvider`. Odabir preko `SMS_PROVIDER`. Ostali pružatelji dodaju se kasnije bez izmjene ostatka koda.

### Tekstovi
Bez dijakritika (GSM-7, ≤ 160 znakova; izbjegni da poruka ode u dva segmenta). Predlošci u kodu, s placeholderima:

- CONFIRMATION: `Vasa rezervacija za {plate} u {store} je potvrdjena za {dd.MM.} u {HH:mm}. Otkazivanje: {url}`
- REMINDER: `Podsjetnik: sutra u {HH:mm} imate termin za zamjenu guma ({store}). Otkazivanje: {url}`
- CANCELLATION: `Vas termin {dd.MM.} u {HH:mm} ({store}) je otkazan.`
- RESCHEDULE: `Vas termin u {store} je pomaknut na {dd.MM.} u {HH:mm}. Otkazivanje: {url}`

`{url}` = `APP_BASE_URL/r/{slug}/b/{manage_token}`. Napiši unit test koji provjerava da nijedan predložak s realnim podacima ne prelazi 160 znakova ni ne sadrži znakove izvan GSM-7 seta.

---

## 7. Aplikacija: rute i ponašanje

### Javno (bez prijave)
- `/r/[slug]`: tok rezervacije, mobile-first, tri koraka:
  1. **Usluga:** dvije velike kartice ("Gume na felgama", "Premontiravanje"). Ispod prikaži trajanje.
  2. **Termin:** odabir datuma (traka od 14 dana + kalendar), zatim termini podijeljeni na "Ujutro" (do 12:00) i "Poslijepodne" (od 12:00). Nedostupni termini se ne prikazuju. Dostupnost se osvježava svakih 20 s. Klik na termin poziva `create_hold`, prikaže se odbrojavanje od 3 minute; kad istekne, vrati na korak 2 uz poruku.
  3. **Podaci:** ime i prezime, broj mobitela, registarska oznaka (sva tri obavezna), Turnstile captcha, kvačica/tekst suglasnosti s linkom na Pravila privatnosti. Tekst uz gumb: "Klikom na rezervaciju na navedeni broj mobitela stizat će vam SMS potvrda te podsjetnik dan prije termina."
  - Nakon uspjeha: ekran potvrde (registracija, datum, vrijeme, adresa, link za otkazivanje).
  - Ako `create_booking` vrati `SLOT_TAKEN`, prikaži "Termin je upravo zauzet, odaberite drugi" i osvježi dostupnost.
- `/r/[slug]/b/[token]`: pregled termina i gumb "Otkaži termin" (poštuje `client_cancel_cutoff_minutes`).
- `/privatnost`: statična stranica s pravilima privatnosti (kratak predložak; voditelj obrade je radionica, izvršitelj vlasnik platforme, rok čuvanja 12 mjeseci).
- Rate limit na javnim endpointima: 10 zahtjeva/min po IP za `availability`, 5/min po IP za `hold` i `booking`. Implementiraj u Postgresu (tablica `rate_limits`) ili u middlewareu; nemoj uvoditi novi vanjski servis.

### Prijava
- `/login`: email + zaporka (Supabase Auth). Nakon prijave preusmjeri po ulozi: `/admin` ili `/super`. Zaštiti rute middlewareom (`@supabase/ssr`).

### Radionica: `/admin`
Optimizirano za tablet u radionici (landscape, velike mete dodira ≥ 48 px, visok kontrast, radi i pri jakom svjetlu).
- **Dnevni raspored** s izbornikom datuma (default danas). Retci sortirani po vremenu. Svaki redak: vrijeme, **registracija u velikom masnom fontu** (min. 2.5rem, tabularni brojevi), ispod ime i mobitel manjim slovima, oznaka usluge, oznaka izvora (online/telefon).
- **Akcije po retku:** "Odrađeno" (redak se zasivi i prebaci u sekciju "Odrađeno" na dnu), "Nije došao", "Otkaži" (dijalog s checkboxom "Obavijesti klijenta SMS-om"), "Pomakni" (odabir drugog slobodnog termina).
- **"Brzi unos"**: istaknuta tipka na vrhu. Dijalog: usluga (default zadnja korištena), popis slobodnih termina danas i sutra (dva dodira do odabira), polje za registraciju (obavezno), ime i mobitel (opcionalno). Poziva `create_booking` sa `source = 'PHONE'`. Rezervacija odmah blokira javni kalendar.
- **Realtime:** nova online rezervacija se pojavi bez osvježavanja, uz kratki zvučni signal i vizualno isticanje retka. Koristi Screen Wake Lock API da ekran ostane upaljen dok je stranica otvorena.
- **`/admin/postavke`:** radno vrijeme po danu, blokade (od-do, razlog), broj dizalica, trajanje usluga (`store_services.slots`), uključivanje usluga.

### Vlasnik platforme: `/super`
- Popis radionica (naziv, slug, aktivna, broj rezervacija ovaj mjesec, stopa nedolazaka).
- Kreiranje/uređivanje radionice: naziv, adresa, slug (provjera jedinstvenosti i rezerviranih riječi uživo), radno vrijeme, dani, broj dizalica.
- Kreiranje admina radionice: server action koristi `supabase.auth.admin.createUser` (service role), postavi `profiles` redak; korisnik dobiva poziv emailom ili privremenu zaporku uz obavezu promjene.
- Generiranje **QR koda** za `APP_BASE_URL/r/{slug}`: prikaz na ekranu, preuzimanje kao SVG i PNG (visoka razlučivost za naljepnicu), plus stranica za ispis A5 naljepnice s tekstom "Naručite se online: skenirajte kod".
- Statistika: grafovi po danu/mjesecu, ukupno rezervacija, odrađeno/otkazano/nije došao, `no_show_rate`, filter po radionici i razdoblju.

---

## 8. Sigurnost i privatnost (obavezno)

- `SUPABASE_SERVICE_ROLE_KEY` samo u server kodu; dodaj lint pravilo ili test koji pada ako se ključ importira u klijentsku komponentu.
- RLS na svim tablicama. Napiši testove (SQL ili Vitest s dva testna admina) koji dokazuju: `store_admin` A ne vidi niti mijenja podatke radionice B; `anon` ne može ništa čitati; `authenticated` ne može pozvati SQL funkcije izravno.
- Sve ulaze validiraj `zod` shemama na serveru; SQL funkcije ponovno validiraju bitno (klijent nije vjerodostojan).
- U logovima maskiraj PII (npr. `+3859*****12`, `ZG****AB`).
- Sigurnosni headeri (CSP, `X-Frame-Options`, `Referrer-Policy`), bez trackera i bez kolačića osim Supabase sesije za prijavljene.
- `manage_token` je 128+ bita entropije; usporedbe tajni u konstantnom vremenu.
- Turnstile token provjeri na serveru prije `create_hold` i `create_booking` za `ONLINE`.

---

## 9. Testovi i kriteriji prihvaćanja

**Vitest (čista logika):** normalizacija registracije i broja, generiranje ćelija, izračun `reminder scheduled_at` u zoni radionice (uključujući prelazak na ljetno/zimsko vrijeme), duljina i znakovi SMS predložaka, formatiranje registracije za prikaz.

**Konkurentnost (skripta nad lokalnim Supabaseom):** radionica s `bays = 1`, jedan slobodan termin; 20 paralelnih poziva `create_booking` za isti termin. **Točno jedan** uspijeva, ostali dobivaju `SLOT_TAKEN`. Ponovi s `bays = 2` (točno dva uspjeha) i s dvoslotnom uslugom koja se preklapa s jednoslotnom rezervacijom.

**Ručni scenariji (opiši u README kao provjeru):**
1. Klijent rezervira termin na telefonu, u konzoli se vidi CONFIRMATION SMS, u adminu se odmah pojavi redak.
2. Majstor u Brzom unosu zauzme isti termin u istom trenutku; jedan od njih dobiva grešku, drugi uspijeva.
3. Hold istekne nakon 3 minute i termin se vrati u ponudu.
4. "Nije došao" na budući termin oslobađa slot na javnoj stranici.
5. Klijent otkaže putem linka; pending podsjetnik prelazi u `CANCELLED`.
6. Admin radionice A ne može otvoriti podatke radionice B ni preko URL-a ni preko API-ja.

---

## 10. Faze rada

**Faza 0: temelj.** Repozitorij, Next.js + Tailwind + shadcn, Supabase lokalno, `.env.example`, `DECISIONS.md`, README s naredbama za pokretanje.

**Faza 1: jezgra.** Migracije (shema, enumi, RLS, indeksi), sve SQL funkcije iz poglavlja 5, seed, Vitest testovi i skripta za konkurentnost. **Ne kreći dalje dok test konkurentnosti ne prolazi.**

**Faza 2: klijentski tok.** `/r/[slug]` s tri koraka, holdovi s odbrojavanjem, Turnstile, rate limit, ekran potvrde, `/r/[slug]/b/[token]`, `/privatnost`.

**Faza 3: SMS.** Outbox, `sms-worker` Edge Function, `pg_cron` rasporedi, `ConsoleSmsProvider` i `TwilioSmsProvider`, predlošci i njihovi testovi.

**Faza 4: dashboard radionice.** Login, `/admin` s realtime osvježavanjem, akcije, Brzi unos, postavke, blokade.

**Faza 5: super admin.** Radionice, admini, QR i ispis naljepnice, statistika.

**Faza 6: završna provjera.** Prođi sigurnosne testove iz poglavlja 8, ručne scenarije iz poglavlja 9, `pnpm build` bez upozorenja, `pnpm lint`, ažuriraj README (postavljanje Supabase projekta, Vercela, `pg_cron` i Edge Function deploy, env varijable). Na kraju ispiši kratak popis poznatih ograničenja.

Deploy (Vercel + Supabase projekt) radi tek kad ti to izričito zatražim.

---

## 11. Stil rada

- Male, fokusirane promjene; jedan commit po logičkoj cjelini (`feat:`, `fix:`, `test:`, `chore:`).
- Ne dodavaj biblioteke koje nisu navedene bez razloga zapisanog u `DECISIONS.md`.
- Ne refaktoriraj kod koji radi i prolazi testove.
- Na početku odgovora ispiši plan faze u najviše 10 redaka, a na kraju faze što je gotovo, što je testirano i što ostaje.
