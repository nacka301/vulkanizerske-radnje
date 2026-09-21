-- Poglavlje 4 (redizajn): registarska oznaka nije uvijek poznata kod
-- telefonske/brze rezervacije u adminu (za razliku od online rezervacije,
-- koja i dalje trazi oznaku na razini aplikacije/forme).
alter table bookings alter column license_plate drop not null;

alter table bookings drop constraint bookings_plate_format;
alter table bookings add constraint bookings_plate_format check (
  license_plate is null or license_plate ~ '^[A-Z0-9]{4,10}$'
);
