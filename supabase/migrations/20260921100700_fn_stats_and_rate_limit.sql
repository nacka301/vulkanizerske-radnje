create or replace function store_stats(
  p_store_id uuid,
  p_from date,
  p_to date,
  p_group text default 'day'
) returns table (
  bucket date,
  store_id uuid,
  total bigint,
  confirmed bigint,
  completed bigint,
  no_show bigint,
  cancelled bigint,
  source_online bigint,
  source_phone bigint,
  source_walk_in bigint,
  no_show_rate numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_group not in ('day', 'month') then
    raise exception 'INVALID_GROUP';
  end if;

  return query
  select
    case
      when p_group = 'day' then date_trunc('day', b.start_time at time zone s.timezone)::date
      else date_trunc('month', b.start_time at time zone s.timezone)::date
    end as bucket,
    b.store_id,
    count(*) as total,
    count(*) filter (where b.status = 'CONFIRMED') as confirmed,
    count(*) filter (where b.status = 'COMPLETED') as completed,
    count(*) filter (where b.status = 'NO_SHOW') as no_show,
    count(*) filter (where b.status = 'CANCELLED') as cancelled,
    count(*) filter (where b.source = 'ONLINE') as source_online,
    count(*) filter (where b.source = 'PHONE') as source_phone,
    count(*) filter (where b.source = 'WALK_IN') as source_walk_in,
    case
      when count(*) filter (where b.status in ('COMPLETED', 'NO_SHOW')) = 0 then null
      else round(
        (count(*) filter (where b.status = 'NO_SHOW'))::numeric
        / (count(*) filter (where b.status in ('COMPLETED', 'NO_SHOW')))::numeric,
        4
      )
    end as no_show_rate
  from bookings b
  join stores s on s.id = b.store_id
  where (p_store_id is null or b.store_id = p_store_id)
    and b.start_time >= (p_from::timestamp at time zone s.timezone)
    and b.start_time < ((p_to + 1)::timestamp at time zone s.timezone)
  group by bucket, b.store_id
  order by bucket;
end;
$$;

revoke execute on function store_stats(uuid, date, date, text) from public, anon, authenticated;
grant execute on function store_stats(uuid, date, date, text) to service_role;

-- Rate limiting za javne endpointe (poglavlje 7): fiksni prozor po minuti,
-- kljuc je "ip:endpoint" koji slaze Next.js route handler.
create or replace function check_rate_limit(p_key text, p_limit int, p_window_seconds int) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

  insert into rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke execute on function check_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function check_rate_limit(text, int, int) to service_role;
