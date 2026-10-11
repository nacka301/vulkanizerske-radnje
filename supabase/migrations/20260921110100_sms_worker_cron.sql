-- Poglavlje 6: pg_cron poziva sms-worker Edge Function svake minute preko
-- pg_net.http_post. URL i tajna se citaju iz app_settings (ista logika kao
-- app_base_url) — vidi DECISIONS.md za razlog (MCP ne izlaze nacin za
-- postavljanje Edge Function secreta).

insert into app_settings (key, value) values
  ('sms_worker_url', 'https://bckmjvnjalvjkojpqmmx.supabase.co/functions/v1/sms-worker')
on conflict (key) do nothing;

select cron.schedule(
  'sms-worker-tick',
  '* * * * *',
  $$
    select net.http_post(
      url := (select value from app_settings where key = 'sms_worker_url'),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-worker-secret', (select value from app_settings where key = 'worker_secret')
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 20000
    );
  $$
);
