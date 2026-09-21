-- Ciscenje (poglavlje 5). SMS worker cron (pg_net http_post) dodaje se u
-- Fazi 3 zajedno s Edge Functionom koji tada postoji.

select cron.schedule(
  'cleanup-expired-holds',
  '* * * * *',
  $$delete from public.slot_holds where expires_at < now() - interval '1 minute'$$
);

-- GDPR minimizacija: nakon 12 mjeseci brisu se osobni podaci klijenta.
select cron.schedule(
  'gdpr-minimize-old-bookings',
  '0 3 * * 0',
  $$
    update public.bookings
    set client_name = null, client_phone = null
    where created_at < now() - interval '12 months'
      and (client_name is not null or client_phone is not null)
  $$
);

-- Ciscenje stare tablice rate_limits (higijena, nije eksplicitno trazeno u
-- specifikaciji, ali sprjecava neograniceni rast male pomocne tablice).
select cron.schedule(
  'cleanup-rate-limits',
  '*/15 * * * *',
  $$delete from public.rate_limits where window_start < now() - interval '1 hour'$$
);
