-- Interna pomocna funkcija: puna provjera termina (radno vrijeme, poravnanje,
-- lead/horizon, blokade, kapacitet). Koriste je create_hold, create_booking i
-- reschedule_booking — uvijek unutar pg_advisory_xact_lock za store+dan.
create or replace function validate_booking_slot(
  p_store_id uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_ignore_hold_id uuid,
  p_ignore_booking_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store stores%rowtype;
  v_local_date date;
  v_weekday smallint;
  v_hours store_hours%rowtype;
  v_open_ts timestamptz;
  v_close_ts timestamptz;
  v_now timestamptz := now();
  v_cell_start timestamptz;
  v_occupied int;
begin
  select * into v_store from stores where id = p_store_id and active;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  v_local_date := (p_start at time zone v_store.timezone)::date;
  v_weekday := extract(isodow from v_local_date)::smallint;

  select * into v_hours from store_hours where store_id = p_store_id and weekday = v_weekday;
  if not found or v_hours.is_closed then
    raise exception 'OUTSIDE_HOURS';
  end if;

  v_open_ts := (v_local_date::timestamp + v_hours.open_time) at time zone v_store.timezone;
  v_close_ts := (v_local_date::timestamp + v_hours.close_time) at time zone v_store.timezone;

  if p_start < v_open_ts or p_end > v_close_ts then
    raise exception 'OUTSIDE_HOURS';
  end if;

  if extract(epoch from (p_start - v_open_ts))::int % (v_store.slot_minutes * 60) <> 0 then
    raise exception 'OUTSIDE_HOURS';
  end if;

  if p_start < v_now + make_interval(mins => v_store.min_lead_minutes) then
    raise exception 'TOO_SOON';
  end if;

  if p_start > v_now + make_interval(days => v_store.max_horizon_days) then
    raise exception 'TOO_FAR';
  end if;

  if exists (
    select 1 from slot_blocks sb
    where sb.store_id = p_store_id and sb.starts_at < p_end and sb.ends_at > p_start
  ) then
    raise exception 'BLOCKED';
  end if;

  for v_cell_start in
    select generate_series(
      p_start,
      p_end - make_interval(mins => v_store.slot_minutes),
      make_interval(mins => v_store.slot_minutes)
    )
  loop
    select
      (
        select count(*) from bookings b
        where b.store_id = p_store_id
          and b.status in ('CONFIRMED', 'COMPLETED')
          and b.start_time < v_cell_start + make_interval(mins => v_store.slot_minutes)
          and b.end_time > v_cell_start
          and (p_ignore_booking_id is null or b.id <> p_ignore_booking_id)
      )
      + (
        select count(*) from slot_holds h
        where h.store_id = p_store_id
          and h.expires_at > v_now
          and h.start_time < v_cell_start + make_interval(mins => v_store.slot_minutes)
          and h.end_time > v_cell_start
          and (p_ignore_hold_id is null or h.id <> p_ignore_hold_id)
      )
      into v_occupied;

    if v_occupied >= v_store.bays then
      raise exception 'SLOT_TAKEN';
    end if;
  end loop;
end;
$$;

revoke execute on function validate_booking_slot(uuid, timestamptz, timestamptz, uuid, uuid)
  from public, anon, authenticated;

-- Sastavlja SMS tijelo iz predlozaka (poglavlje 6). Predlosci su vec ciste
-- GSM-7/ASCII recenice; ime radionice se ciste od dijakritika da cijela
-- poruka ostane unutar GSM-7 seta (test u src/lib/sms/templates.test.ts).
create or replace function build_sms_body(
  p_kind sms_kind,
  p_plate text,
  p_store_name text,
  p_start timestamptz,
  p_tz text,
  p_url text
) returns text
language plpgsql
stable
as $$
declare
  v_store_name text := hr_strip_diacritics(p_store_name);
  v_date text := to_char(p_start at time zone p_tz, 'DD.MM.');
  v_time text := to_char(p_start at time zone p_tz, 'HH24:MI');
begin
  return case p_kind
    when 'CONFIRMATION' then format(
      'Vasa rezervacija za %s u %s je potvrdjena za %s u %s. Otkazivanje: %s',
      p_plate, v_store_name, v_date, v_time, p_url
    )
    when 'REMINDER' then format(
      'Podsjetnik: sutra u %s imate termin za zamjenu guma (%s). Otkazivanje: %s',
      v_time, v_store_name, p_url
    )
    when 'CANCELLATION' then format(
      'Vas termin %s u %s (%s) je otkazan.',
      v_date, v_time, v_store_name
    )
    when 'RESCHEDULE' then format(
      'Vas termin u %s je pomaknut na %s u %s. Otkazivanje: %s',
      v_store_name, v_date, v_time, p_url
    )
  end;
end;
$$;

create or replace function create_hold(
  p_store_id uuid,
  p_service_id uuid,
  p_start timestamptz
) returns slot_holds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store stores%rowtype;
  v_slots int;
  v_end timestamptz;
  v_local_date date;
  v_hold slot_holds%rowtype;
begin
  select * into v_store from stores where id = p_store_id and active;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  select slots into v_slots from store_services
    where store_id = p_store_id and service_id = p_service_id and enabled;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  v_end := p_start + make_interval(mins => v_slots * v_store.slot_minutes);
  v_local_date := (p_start at time zone v_store.timezone)::date;

  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || v_local_date::text, 0));

  delete from slot_holds where store_id = p_store_id and expires_at <= now();

  perform validate_booking_slot(p_store_id, p_start, v_end, null, null);

  insert into slot_holds (store_id, service_id, start_time, end_time, expires_at)
  values (p_store_id, p_service_id, p_start, v_end, now() + interval '3 minutes')
  returning * into v_hold;

  return v_hold;
end;
$$;

revoke execute on function create_hold(uuid, uuid, timestamptz) from public, anon, authenticated;
grant execute on function create_hold(uuid, uuid, timestamptz) to service_role;

create or replace function create_booking(
  p_store_id uuid,
  p_service_id uuid,
  p_start timestamptz,
  p_plate text,
  p_name text,
  p_phone text,
  p_source booking_source,
  p_hold_id uuid default null
) returns bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store stores%rowtype;
  v_slots int;
  v_end timestamptz;
  v_local_date date;
  v_booking bookings%rowtype;
  v_phone_count int;
  v_url text;
  v_body text;
  v_reminder_local_date date;
  v_reminder_ts timestamptz;
begin
  select * into v_store from stores where id = p_store_id and active;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  select slots into v_slots from store_services
    where store_id = p_store_id and service_id = p_service_id and enabled;
  if not found then
    raise exception 'STORE_NOT_FOUND';
  end if;

  v_end := p_start + make_interval(mins => v_slots * v_store.slot_minutes);
  v_local_date := (p_start at time zone v_store.timezone)::date;

  perform pg_advisory_xact_lock(hashtextextended(p_store_id::text || ':' || v_local_date::text, 0));

  delete from slot_holds where store_id = p_store_id and expires_at <= now();

  perform validate_booking_slot(p_store_id, p_start, v_end, p_hold_id, null);

  if p_source = 'ONLINE' then
    select count(*) into v_phone_count
    from bookings
    where store_id = p_store_id
      and client_phone = p_phone
      and status = 'CONFIRMED'
      and start_time > now();
    if v_phone_count >= 3 then
      raise exception 'PHONE_LIMIT';
    end if;
  end if;

  insert into bookings (
    store_id, service_id, license_plate, client_name, client_phone,
    start_time, end_time, slot_count, status, source
  ) values (
    p_store_id, p_service_id, p_plate, p_name, p_phone,
    p_start, v_end, v_slots, 'CONFIRMED', p_source
  ) returning * into v_booking;

  if p_hold_id is not null then
    delete from slot_holds where id = p_hold_id;
  end if;

  insert into booking_events (booking_id, event, actor, data)
  values (
    v_booking.id, 'created',
    case when p_source = 'ONLINE' then 'client' else 'system' end,
    jsonb_build_object('source', p_source)
  );

  if v_booking.client_phone is not null then
    v_url := app_setting('app_base_url') || '/r/' || v_store.slug || '/b/' || v_booking.manage_token;

    v_body := build_sms_body('CONFIRMATION', v_booking.license_plate, v_store.name, v_booking.start_time, v_store.timezone, v_url);
    insert into sms_outbox (booking_id, kind, to_phone, body, scheduled_at)
    values (v_booking.id, 'CONFIRMATION', v_booking.client_phone, v_body, now());

    v_reminder_local_date := v_local_date - 1;
    v_reminder_ts := (v_reminder_local_date::timestamp + time '18:00') at time zone v_store.timezone;
    if v_reminder_ts > now() then
      v_body := build_sms_body('REMINDER', v_booking.license_plate, v_store.name, v_booking.start_time, v_store.timezone, v_url);
      insert into sms_outbox (booking_id, kind, to_phone, body, scheduled_at)
      values (v_booking.id, 'REMINDER', v_booking.client_phone, v_body, v_reminder_ts);
    end if;
  end if;

  return v_booking;
end;
$$;

revoke execute on function create_booking(uuid, uuid, timestamptz, text, text, text, booking_source, uuid)
  from public, anon, authenticated;
grant execute on function create_booking(uuid, uuid, timestamptz, text, text, text, booking_source, uuid)
  to service_role;
