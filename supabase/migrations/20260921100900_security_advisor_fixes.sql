-- Ispravci na temelju Supabase security advisora (poglavlje 8):
-- 1. seed_store_services je okidacka funkcija, ne treba biti pozivna preko
--    RPC-a (anon/authenticated su je mogli pozvati izravno).
-- 2. hr_strip_diacritics/build_sms_body nisu imale eksplicitan search_path
--    (moguca search_path hijack ranjivost).
-- pg_net advisor upozorenje ("Extension in Public") je prihvaceno bez
-- ispravka: pg_net ne podrzava ALTER EXTENSION ... SET SCHEMA (njegove
-- funkcije zive u fiksnoj shemi "net" bez obzira na to gdje je sam
-- extension "container" registriran), pa se ne moze premjestiti — vidi
-- DECISIONS.md.

revoke execute on function seed_store_services() from public, anon, authenticated;

alter function hr_strip_diacritics(text) set search_path = public;
alter function build_sms_body(sms_kind, text, text, timestamptz, text, text) set search_path = public;
