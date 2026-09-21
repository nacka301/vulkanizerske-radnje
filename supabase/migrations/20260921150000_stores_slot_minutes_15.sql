-- Poglavlje 3 (redizajn): dopusti finiju granulaciju termina (15 min) uz
-- postojecih 30 min, tako da trajanje usluge moze biti npr. 45 min (nije
-- visekratnik 30). Nove radionice i dalje defaultiraju na 30 min
-- (stores.slot_minutes default ostaje 30); postojece radionice mogu
-- rucno prijeci na 15 (vidi DECISIONS.md za demo store update).
alter table stores drop constraint stores_slot_minutes_check;
alter table stores add constraint stores_slot_minutes_check check (slot_minutes in (15, 30));
