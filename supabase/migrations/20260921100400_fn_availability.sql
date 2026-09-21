-- get_availability (poglavlje 5)
create or replace function get_availability(
  p_store_id uuid,
  p_date date,
  p_service_id uuid
) returns table (start_time timestamptz, available boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_store stores%rowtype;
  v_hours store_hours%rowtype;
  v_slots int;
  v_weekday smallint;
  v_open_ts timestamptz;
  v_close_ts timestamptz;
  v_now timestamptz := now();
  v_min_start timestamptz;
  v_max_start timestamptz;
begin
  select * into v_store from stores where id = p_store_id and active;
  if not found then
    return;
  end if;

  v_weekday := extract(isodow from p_date)::smallint;
  select * into v_hours from store_hours where store_id = p_store_id and weekday = v_weekday;
  if not found or v_hours.is_closed then
    return;
  end if;

  select ss.slots into v_slots
  from store_services ss
  where ss.store_id = p_store_id and ss.service_id = p_service_id and ss.enabled;
  if not found then
    return;
  end if;

  v_open_ts := (p_date::timestamp + v_hours.open_time) at time zone v_store.timezone;
  v_close_ts := (p_date::timestamp + v_hours.close_time) at time zone v_store.timezone;
  v_min_start := v_now + make_interval(mins => v_store.min_lead_minutes);
  v_max_start := v_now + make_interval(days => v_store.max_horizon_days);

  return query
  with cells as (
    select
      gs as cell_start,
      gs + make_interval(mins => v_store.slot_minutes) as cell_end
    from generate_series(
      v_open_ts,
      v_close_ts - make_interval(mins => v_store.slot_minutes),
      make_interval(mins => v_store.slot_minutes)
    ) gs
  ),
  occupancy as (
    select
      c.cell_start,
      (
        select count(*)::int from bookings b
        where b.store_id = p_store_id
          and b.status in ('CONFIRMED', 'COMPLETED')
          and b.start_time < c.cell_end
          and b.end_time > c.cell_start
      )
      + (
        select count(*)::int from slot_holds h
        where h.store_id = p_store_id
          and h.expires_at > v_now
          and h.start_time < c.cell_end
          and h.end_time > c.cell_start
      )
      + (
        case when exists (
          select 1 from slot_blocks sb
          where sb.store_id = p_store_id
            and sb.starts_at < c.cell_end
            and sb.ends_at > c.cell_start
        ) then v_store.bays else 0 end
      ) as occupied
    from cells c
  )
  select
    cand.cell_start as start_time,
    (
      cand.cell_start >= v_min_start
      and cand.cell_start <= v_max_start
      and not exists (
        select 1 from occupancy o
        where o.cell_start >= cand.cell_start
          and o.cell_start < cand.cell_start + make_interval(mins => v_slots * v_store.slot_minutes)
          and o.occupied >= v_store.bays
      )
    ) as available
  from cells cand
  where cand.cell_start + make_interval(mins => v_slots * v_store.slot_minutes) <= v_close_ts
  order by cand.cell_start;
end;
$$;

revoke execute on function get_availability(uuid, date, uuid) from public, anon, authenticated;
grant execute on function get_availability(uuid, date, uuid) to service_role;
