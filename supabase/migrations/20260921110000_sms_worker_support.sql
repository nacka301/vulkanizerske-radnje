-- Poglavlje 6: podrska za sms-worker.

-- Potrebno za "Retke koji su predugo u SENDING (vise od 5 min) vrati u
-- PENDING" — bez ove kolone ne bismo znali otkad je redak u SENDING statusu
-- (nije eksplicitno u poglavlju 4, ali nuzno za poglavlje 6).
alter table sms_outbox add column sending_at timestamptz;

-- Atomsko "zauzimanje" do 50 redaka za slanje (FOR UPDATE SKIP LOCKED ne
-- postoji kao PostgREST operacija, pa ide kroz SQL funkciju).
create or replace function claim_pending_sms(p_limit int default 50) returns setof sms_outbox
language sql
security definer
set search_path = public
as $$
  update sms_outbox
  set status = 'SENDING', attempts = attempts + 1, sending_at = now()
  where id in (
    select id from sms_outbox
    where status = 'PENDING' and scheduled_at <= now()
    order by scheduled_at
    limit p_limit
    for update skip locked
  )
  returning *;
$$;

revoke execute on function claim_pending_sms(int) from public, anon, authenticated;
grant execute on function claim_pending_sms(int) to service_role;

-- Worker se mogao srusiti usred slanja; vrati zaboravljene SENDING retke u PENDING.
create or replace function recover_stuck_sms() returns void
language sql
security definer
set search_path = public
as $$
  update sms_outbox
  set status = 'PENDING', sending_at = null
  where status = 'SENDING' and sending_at < now() - interval '5 minutes';
$$;

revoke execute on function recover_stuck_sms() from public, anon, authenticated;
grant execute on function recover_stuck_sms() to service_role;

-- Konfiguracija sms-worker Edge Functiona. Supabase MCP ne izlaze nacin za
-- postavljanje Edge Function secreta (`supabase secrets set`), pa worker
-- svoju konfiguraciju (dijeljenu tajnu, odabir providera) cita iz ove
-- tablice preko service-role klijenta umjesto iz Deno.env — vidi
-- DECISIONS.md. pg_cron cron poslovi rade isto.
insert into app_settings (key, value) values
  ('worker_secret', 'fGMY0Z2PBz1ER7iTKGmJvr7lvFI4yCtkQoP2H6UVLtw'),
  ('sms_provider', 'console'),
  ('sms_sender_id', 'Vulkanizer')
on conflict (key) do nothing;
