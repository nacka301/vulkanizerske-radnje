-- Pomocne funkcije koje koriste RLS politike i poslovna logika.

create or replace function app_setting(p_key text) returns text
language sql stable
security definer
set search_path = public
as $$
  select value from app_settings where key = p_key;
$$;

revoke execute on function app_setting(text) from public, anon, authenticated;
grant execute on function app_setting(text) to service_role;

create or replace function hr_strip_diacritics(p_text text) returns text
language sql
immutable
as $$
  select translate(p_text, 'čćžšđČĆŽŠĐ', 'cczsdCCZSD');
$$;

-- Koriste ih RLS politike kao "authenticated" — vracaju samo podatke o
-- pozivatelju (vlastitu ulogu/store_id), pa je siguran izuzetak od pravila
-- "REVOKE ... FROM authenticated" koje vrijedi za poslovnu logiku (poglavlje
-- 8, tocka 2). security definer izbjegava beskonacnu rekurziju RLS politike
-- nad profiles (funkcija zaobilazi RLS jer se izvrsava kao vlasnik).
create or replace function auth_role() returns user_role
language sql stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function auth_store_id() returns uuid
language sql stable
security definer
set search_path = public
as $$
  select store_id from profiles where id = auth.uid();
$$;

revoke execute on function auth_role() from public, anon;
revoke execute on function auth_store_id() from public, anon;
grant execute on function auth_role() to authenticated;
grant execute on function auth_store_id() to authenticated;

-- Kod kreiranja radionice automatski se dodaju oba retka store_services s
-- default vrijednostima (poglavlje 4).
create or replace function seed_store_services() returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into store_services (store_id, service_id, slots, enabled)
  select new.id, s.id, s.default_slots, true
  from services s
  on conflict (store_id, service_id) do nothing;
  return new;
end;
$$;

create trigger stores_after_insert_seed_services
after insert on stores
for each row execute function seed_store_services();
