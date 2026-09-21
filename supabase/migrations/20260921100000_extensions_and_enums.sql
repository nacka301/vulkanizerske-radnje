-- Ekstenzije. Supabase (lokalno i hosted) vec dolazi s pgcrypto
-- predinstaliranim u shemi "extensions" — otud eksplicitna shema ovdje, i
-- otud "set search_path = public, extensions" na funkcijama koje pozivaju
-- digest()/gen_random_bytes() (client_cancel_booking, get_booking_by_token).
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema public;

-- Enumi (poglavlje 4)
create type booking_status as enum ('CONFIRMED', 'COMPLETED', 'NO_SHOW', 'CANCELLED');
create type booking_source as enum ('ONLINE', 'PHONE', 'WALK_IN');
create type sms_kind as enum ('CONFIRMATION', 'REMINDER', 'CANCELLATION', 'RESCHEDULE');
create type sms_status as enum ('PENDING', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');
create type user_role as enum ('super_admin', 'store_admin');
