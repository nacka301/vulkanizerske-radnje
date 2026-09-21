-- Poglavlje 3, tocke 2-3 i poglavlje 8: RLS ukljucen na svim tablicama.
-- anon nema nijednu policy (potpuno bez pristupa). authenticated ima samo
-- SELECT policy tamo gdje admin dashboard izravno cita preko browsera;
-- svi upisi idu preko SECURITY DEFINER funkcija / server actiona sa
-- service_role kljucem (koji zaobilazi RLS), pa INSERT/UPDATE/DELETE
-- policyji namjerno ne postoje za authenticated.

alter table stores enable row level security;
create policy stores_select on stores for select to authenticated
  using (auth_role() = 'super_admin' or id = auth_store_id());

alter table store_hours enable row level security;
create policy store_hours_select on store_hours for select to authenticated
  using (auth_role() = 'super_admin' or store_id = auth_store_id());

alter table slot_blocks enable row level security;
create policy slot_blocks_select on slot_blocks for select to authenticated
  using (auth_role() = 'super_admin' or store_id = auth_store_id());

alter table services enable row level security;
create policy services_select on services for select to authenticated using (true);

alter table store_services enable row level security;
create policy store_services_select on store_services for select to authenticated
  using (auth_role() = 'super_admin' or store_id = auth_store_id());

alter table profiles enable row level security;
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or auth_role() = 'super_admin');

alter table bookings enable row level security;
create policy bookings_select on bookings for select to authenticated
  using (auth_role() = 'super_admin' or store_id = auth_store_id());

alter table booking_events enable row level security;
create policy booking_events_select on booking_events for select to authenticated
  using (
    auth_role() = 'super_admin'
    or exists (
      select 1 from bookings b
      where b.id = booking_events.booking_id and b.store_id = auth_store_id()
    )
  );

-- Bez SELECT policyja za authenticated (nisu dio admin sucelja, ili nose
-- osjetljive/interne podatke) — samo service_role (zaobilazi RLS) ima
-- pristup.
alter table slot_holds enable row level security;
alter table sms_outbox enable row level security;
alter table rate_limits enable row level security;
alter table app_settings enable row level security;
