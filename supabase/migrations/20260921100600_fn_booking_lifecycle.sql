create or replace function set_booking_status(
  p_store_id uuid,
  p_booking_id uuid,
  p_status booking_status,
  p_notify boolean default false,
  p_actor uuid default null
) returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
  v_store stores%rowtype;
  v_event text;
  v_url text;
  v_body text;
begin
  select * into v_booking from bookings where id = p_booking_id and store_id = p_store_id for update;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  if v_booking.status <> 'CONFIRMED' or p_status not in ('COMPLETED', 'NO_SHOW', 'CANCELLED') then
    raise exception 'INVALID_TRANSITION';
  end if;

  select * into v_store from stores where id = p_store_id;

  update bookings
  set status = p_status, status_changed_at = now(), updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  v_event := case p_status
    when 'COMPLETED' then 'completed'
    when 'NO_SHOW' then 'no_show'
    when 'CANCELLED' then 'cancelled'
  end;

  insert into booking_events (booking_id, event, actor, data)
  values (p_booking_id, v_event, coalesce(p_actor::text, 'system'), jsonb_build_object('notify', p_notify));

  if p_status = 'CANCELLED' then
    update sms_outbox set status = 'CANCELLED'
    where booking_id = p_booking_id and status = 'PENDING';

    if p_notify and v_booking.client_phone is not null then
      v_url := app_setting('app_base_url') || '/r/' || v_store.slug || '/b/' || v_booking.manage_token;
      v_body := build_sms_body('CANCELLATION', v_booking.license_plate, v_store.name, v_booking.start_time, v_store.timezone, v_url);
      insert into sms_outbox (booking_id, kind, to_phone, body, scheduled_at)
      values (p_booking_id, 'CANCELLATION', v_booking.client_phone, v_body, now());
    end if;
  end if;

  return v_booking;
end;
$$;

revoke execute on function set_booking_status(uuid, uuid, booking_status, boolean, uuid)
  from public, anon, authenticated;
grant execute on function set_booking_status(uuid, uuid, booking_status, boolean, uuid) to service_role;

create or replace function reschedule_booking(
  p_store_id uuid,
  p_booking_id uuid,
  p_new_start timestamptz,
  p_notify boolean,
  p_actor uuid
) returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_booking bookings%rowtype;
  v_store stores%rowtype;
  v_slots int;
  v_new_end timestamptz;
  v_old_date date;
  v_new_date date;
  v_first_date date;
  v_second_date date;
  v_url text;
  v_body text;
  v_reminder_local_date date;
  v_reminder_ts timestamptz;
begin
  select * into v_booking from bookings where id = p_booking_id and store_id = p_store_id for update;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;
  if v_booking.status <> 'CONFIRMED' then
    raise exception 'INVALID_TRANSITION';
  end if;

  select * into v_store from stores where id = p_store_id and active;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  select slots into v_slots from store_services
    where store_id = p_store_id and service_id = v_booking.service_id and enabled;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  v_new_end := p_new_start + make_interval(mins => v_slots * v_store.slot_minutes);
  v_old_date := (v_booking.start_time at time zone v_store.timezone)::date;
  v_new_date := (p_new_start at time zone v_store.timezone)::date;

  -- zakljucaj oba dana uvijek istim (sortiranim) redoslijedom da izbjegnemo deadlock
  v_first_date := least(v_old_date, v_new_date);
  v_second_date := greatest(v_old_date, v_new_date);

  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || v_first_date::text, 0));
  if v_second_date <> v_first_date then
    perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || v_second_date::text, 0));
  end if;

  delete from slot_holds where store_id = p_store_id and expires_at <= now();

  perform validate_booking_slot(p_store_id, p_new_start, v_new_end, null, p_booking_id);

  update bookings
  set start_time = p_new_start, end_time = v_new_end, updated_at = now()
  where id = p_booking_id
  returning * into v_booking;

  insert into booking_events (booking_id, event, actor, data)
  values (p_booking_id, 'rescheduled', coalesce(p_actor::text, 'system'), jsonb_build_object('new_start', p_new_start));

  update sms_outbox set status = 'CANCELLED' where booking_id = p_booking_id and status = 'PENDING';

  if v_booking.client_phone is not null then
    v_url := app_setting('app_base_url') || '/r/' || v_store.slug || '/b/' || v_booking.manage_token;

    if p_notify then
      v_body := build_sms_body('RESCHEDULE', v_booking.license_plate, v_store.name, v_booking.start_time, v_store.timezone, v_url);
      insert into sms_outbox (booking_id, kind, to_phone, body, scheduled_at)
      values (p_booking_id, 'RESCHEDULE', v_booking.client_phone, v_body, now());
    end if;

    v_reminder_local_date := v_new_date - 1;
    v_reminder_ts := (v_reminder_local_date::timestamp + time '18:00') at time zone v_store.timezone;
    if v_reminder_ts > now() then
      v_body := build_sms_body('REMINDER', v_booking.license_plate, v_store.name, v_booking.start_time, v_store.timezone, v_url);
      insert into sms_outbox (booking_id, kind, to_phone, body, scheduled_at)
      values (p_booking_id, 'REMINDER', v_booking.client_phone, v_body, v_reminder_ts);
    end if;
  end if;

  return v_booking;
end;
$$;

revoke execute on function reschedule_booking(uuid, uuid, timestamptz, boolean, uuid)
  from public, anon, authenticated;
grant execute on function reschedule_booking(uuid, uuid, timestamptz, boolean, uuid) to service_role;

create or replace function client_cancel_booking(p_token text) returns bookings
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_booking bookings%rowtype;
  v_store stores%rowtype;
begin
  select * into v_booking from bookings where manage_token_hash = digest(p_token, 'sha256') for update;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  if v_booking.status <> 'CONFIRMED' then
    raise exception 'INVALID_TRANSITION';
  end if;

  select * into v_store from stores where id = v_booking.store_id;

  if v_booking.start_time < now() + make_interval(mins => v_store.client_cancel_cutoff_minutes) then
    raise exception 'CUTOFF_PASSED';
  end if;

  update bookings
  set status = 'CANCELLED', status_changed_at = now(), updated_at = now()
  where id = v_booking.id
  returning * into v_booking;

  insert into booking_events (booking_id, event, actor, data)
  values (v_booking.id, 'client_cancelled', 'client', '{}'::jsonb);

  update sms_outbox set status = 'CANCELLED' where booking_id = v_booking.id and status = 'PENDING';

  return v_booking;
end;
$$;

revoke execute on function client_cancel_booking(text) from public, anon, authenticated;
grant execute on function client_cancel_booking(text) to service_role;

-- Nije eksplicitno navedena u poglavlju 5, ali potrebna je da /r/[slug]/b/[token]
-- moze procitati rezervaciju bez izravnog pristupa tablici (poglavlje 3,
-- tocka 2 — anon nema pristup tablicama). Vidi DECISIONS.md.
create or replace function get_booking_by_token(p_token text) returns bookings
language sql
security definer
set search_path = public, extensions
as $$
  select * from bookings where manage_token_hash = digest(p_token, 'sha256');
$$;

revoke execute on function get_booking_by_token(text) from public, anon, authenticated;
grant execute on function get_booking_by_token(text) to service_role;
