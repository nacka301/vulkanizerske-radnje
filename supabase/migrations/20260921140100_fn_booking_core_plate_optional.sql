-- create_booking dobiva p_notes i vise ne zahtjeva plate (poglavlje 4
-- redizajn); build_sms_body CONFIRMATION poruka radi bez plate kad je null.
-- Stari 8-arg overload create_booking mora se obrisati, inace supabase-js
-- rpc pozivi bez p_notes postaju nejednoznacni (dva kandidata s istim
-- imenom, drugi preko defaulta).
drop function if exists create_booking(uuid, uuid, timestamptz, text, text, text, booking_source, uuid);

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
    when 'CONFIRMATION' then
      case when p_plate is not null then
        format(
          'Vasa rezervacija za %s u %s je potvrdjena za %s u %s. Otkazivanje: %s',
          p_plate, v_store_name, v_date, v_time, p_url
        )
      else
        format(
          'Vasa rezervacija u %s je potvrdjena za %s u %s. Otkazivanje: %s',
          v_store_name, v_date, v_time, p_url
        )
      end
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

create or replace function create_booking(
  p_store_id uuid,
  p_service_id uuid,
  p_start timestamptz,
  p_plate text,
  p_name text,
  p_phone text,
  p_source booking_source,
  p_hold_id uuid default null,
  p_notes text default null
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
    start_time, end_time, slot_count, status, source, notes
  ) values (
    p_store_id, p_service_id, p_plate, p_name, p_phone,
    p_start, v_end, v_slots, 'CONFIRMED', p_source, p_notes
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

revoke execute on function create_booking(uuid, uuid, timestamptz, text, text, text, booking_source, uuid, text) from public, anon, authenticated;
grant execute on function create_booking(uuid, uuid, timestamptz, text, text, text, booking_source, uuid, text) to service_role;
