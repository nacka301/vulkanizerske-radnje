-- Poglavlje 6 (redizajn): opcionalna dnevna pauza (npr. rucak) po danu u tjednu.
alter table store_hours
  add column break_start time null,
  add column break_end time null;

alter table store_hours
  add constraint store_hours_break_aligned check (
    (break_start is null or (extract(minute from break_start)::int % 30 = 0 and extract(second from break_start) = 0))
    and (break_end is null or (extract(minute from break_end)::int % 30 = 0 and extract(second from break_end) = 0))
  );

alter table store_hours
  add constraint store_hours_break_pair check (
    (break_start is null) = (break_end is null)
  );

alter table store_hours
  add constraint store_hours_break_order_check check (
    break_start is null or break_end > break_start
  );

alter table store_hours
  add constraint store_hours_break_within_hours_check check (
    break_start is null or (break_start >= open_time and break_end <= close_time)
  );
