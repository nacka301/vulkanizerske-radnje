-- Jedna demo radionica (poglavlje 10, Faza 0/1). Admin korisnici se ne
-- seedaju ovdje jer zahtijevaju Supabase Auth (GoTrue), ne obicni SQL insert
-- — vidi scripts/create-admin.ts (Faza 4/5).

insert into services (code, name, default_slots) values
  ('TIRES_ON_RIMS', 'Gume na felgama', 1),
  ('TIRE_REMOUNT', 'Premontiravanje', 2);

insert into stores (slug, name, address, phone, timezone, bays)
values ('demo', 'Vulkanizer Demo', 'Ilica 1, Zagreb', '+385911234567', 'Europe/Zagreb', 2);

-- store_services se automatski popunjava trigerom stores_after_insert_seed_services.

insert into store_hours (store_id, weekday, open_time, close_time, is_closed)
select s.id, w.weekday, w.open_time, w.close_time, w.is_closed
from stores s
cross join (values
  (1, time '08:00', time '16:00', false),
  (2, time '08:00', time '16:00', false),
  (3, time '08:00', time '16:00', false),
  (4, time '08:00', time '16:00', false),
  (5, time '08:00', time '16:00', false),
  (6, time '08:00', time '13:00', false),
  (7, time '00:00', time '00:00', true)
) as w(weekday, open_time, close_time, is_closed)
where s.slug = 'demo';
