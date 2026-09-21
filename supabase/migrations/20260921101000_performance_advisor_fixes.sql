-- Ispravci na temelju Supabase performance advisora.

create index bookings_service_id_idx on bookings (service_id);
create index profiles_store_id_idx on profiles (store_id);
create index slot_holds_service_id_idx on slot_holds (service_id);
create index store_services_service_id_idx on store_services (service_id);

-- auth.uid() u RLS izrazu se inace ponovno evaluira po retku; (select auth.uid())
-- postaje initplan i evaluira se jednom po upitu.
drop policy profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated
  using (id = (select auth.uid()) or auth_role() = 'super_admin');
