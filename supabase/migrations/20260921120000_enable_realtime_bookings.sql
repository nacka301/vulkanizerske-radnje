-- Poglavlje 7: admin dashboard prima novu online rezervaciju bez
-- osvjezavanja preko Supabase Realtime, filtrirano po store_id (RLS vec
-- ogranicava koje retke store_admin uopce moze primiti).
alter publication supabase_realtime add table bookings;
