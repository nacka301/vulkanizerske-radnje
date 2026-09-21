-- Poglavlje 4: shema baze

create table stores (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  address text,
  phone text,
  timezone text not null default 'Europe/Zagreb',
  bays int not null default 1,
  slot_minutes int not null default 30,
  min_lead_minutes int not null default 60,
  max_horizon_days int not null default 60,
  client_cancel_cutoff_minutes int not null default 120,
  require_otp boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint stores_bays_check check (bays >= 1),
  constraint stores_slot_minutes_check check (slot_minutes = 30),
  constraint stores_slug_format check (slug ~ '^[a-z0-9-]{3,40}$'),
  constraint stores_slug_not_reserved check (
    slug not in ('admin', 'super', 'login', 'api', 'r')
  )
);

create table store_hours (
  store_id uuid not null references stores (id) on delete cascade,
  weekday smallint not null,
  open_time time not null,
  close_time time not null,
  is_closed boolean not null default false,
  primary key (store_id, weekday),
  constraint store_hours_weekday_check check (weekday between 1 and 7),
  constraint store_hours_aligned check (
    extract(minute from open_time)::int % 30 = 0
    and extract(second from open_time) = 0
    and extract(minute from close_time)::int % 30 = 0
    and extract(second from close_time) = 0
  ),
  constraint store_hours_order_check check (is_closed or close_time > open_time)
);

create table slot_blocks (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  constraint slot_blocks_range_check check (ends_at > starts_at)
);

create index slot_blocks_store_range_idx on slot_blocks (store_id, starts_at, ends_at);

create table services (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  default_slots int not null,
  constraint services_default_slots_check check (default_slots >= 1)
);

create table store_services (
  store_id uuid not null references stores (id) on delete cascade,
  service_id uuid not null references services (id) on delete cascade,
  slots int not null,
  enabled boolean not null default true,
  primary key (store_id, service_id),
  constraint store_services_slots_check check (slots between 1 and 8)
);

-- profiles.id spaja se na auth.users, ali FK se dodaje lazy (auth shema
-- postoji tek u pravom Supabase projektu / lokalnom stacku, ne u praznoj
-- Postgres instanci) — referenciramo je izravno jer je i lokalni i remote
-- Supabase uvijek imaju auth.users.
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role user_role not null,
  store_id uuid references stores (id) on delete cascade,
  constraint profiles_role_store_check check (
    role = 'super_admin' or store_id is not null
  )
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  service_id uuid not null references services (id),
  license_plate text not null,
  client_name text,
  client_phone text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  slot_count int not null,
  status booking_status not null default 'CONFIRMED',
  source booking_source not null,
  manage_token text not null default translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_'),
  manage_token_hash bytea generated always as (digest(manage_token, 'sha256')) stored,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  status_changed_at timestamptz not null default now(),
  constraint bookings_time_check check (end_time > start_time),
  constraint bookings_slot_count_check check (slot_count >= 1),
  constraint bookings_online_requires_contact check (
    source <> 'ONLINE' or (client_name is not null and client_phone is not null)
  ),
  constraint bookings_plate_format check (license_plate ~ '^[A-Z0-9]{4,10}$'),
  constraint bookings_phone_format check (
    client_phone is null or client_phone ~ '^\+[1-9][0-9]{6,14}$'
  )
);

-- manage_token nosi se u SMS linkovima i mora ostati citljiv (nije hashiran),
-- ali provjere po tokenu (client_cancel_booking, get_booking_by_token) idu
-- preko manage_token_hash kako index scan po plaintext tokenu ne bi mogao
-- curiti informaciju usporedbom (poglavlje 8: "usporedbe tajni u konstantnom
-- vremenu"). Zato je unique constraint na hashu, a ne na plaintextu.
alter table bookings add constraint bookings_manage_token_unique unique (manage_token);
create unique index bookings_manage_token_hash_idx on bookings (manage_token_hash);
create index bookings_store_start_idx on bookings (store_id, start_time);
create index bookings_store_status_start_idx on bookings (store_id, status, start_time);

create table slot_holds (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references stores (id) on delete cascade,
  service_id uuid not null references services (id),
  start_time timestamptz not null,
  end_time timestamptz not null,
  expires_at timestamptz not null default (now() + interval '3 minutes'),
  created_at timestamptz not null default now(),
  constraint slot_holds_time_check check (end_time > start_time)
);

create index slot_holds_store_active_idx on slot_holds (store_id, expires_at, start_time, end_time);

create table sms_outbox (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references bookings (id) on delete set null,
  kind sms_kind not null,
  to_phone text not null,
  body text not null,
  status sms_status not null default 'PENDING',
  scheduled_at timestamptz not null default now(),
  attempts int not null default 0,
  provider_message_id text,
  error text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create index sms_outbox_status_scheduled_idx on sms_outbox (status, scheduled_at);
create index sms_outbox_booking_idx on sms_outbox (booking_id);

create table booking_events (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings (id) on delete cascade,
  event text not null,
  actor text not null,
  data jsonb not null default '{}'::jsonb,
  at timestamptz not null default now()
);

create index booking_events_booking_idx on booking_events (booking_id);

create table rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

create table app_settings (
  key text primary key,
  value text not null
);

insert into app_settings (key, value) values ('app_base_url', 'http://localhost:3000');
