/**
 * Provjera RLS-a nad lokalnim Supabaseom (poglavlje 8/9): dva store_admin
 * korisnika iz razlicitih radionica, anon klijent, i authenticated koji
 * pokusava pozvati poslovnu SQL funkciju izravno.
 *
 * Pokreni s `pnpm test:rls` dok je `supabase start` aktivan.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SERVICE_ROLE_KEY || !ANON_KEY) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY i SUPABASE_ANON_KEY moraju biti postavljeni " +
      "(iz `supabase start` outputa), npr.:\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=<key> SUPABASE_ANON_KEY=<key> pnpm test:rls",
  );
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let failures = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    failures += 1;
    console.error(`  FAIL: ${message}`);
  } else {
    console.log(`  OK: ${message}`);
  }
}

async function makeStoreWithAdmin(slug: string, email: string) {
  const { data: store, error } = await admin
    .from("stores")
    .insert({ slug, name: `RLS Test ${slug}` })
    .select()
    .single();
  if (error || !store) throw error ?? new Error("store insert failed");

  const password = "Test1234!Test1234";
  const { data: user, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (userError || !user.user) throw userError ?? new Error("user create failed");

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: user.user.id, role: "store_admin", store_id: store.id });
  if (profileError) throw profileError;

  return { store, email, password, userId: user.user.id };
}

async function signIn(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

async function cleanup(storeIds: string[], userIds: string[]) {
  for (const id of userIds) {
    await admin.auth.admin.deleteUser(id).catch(() => {});
  }
  for (const id of storeIds) {
    await admin.from("stores").delete().eq("id", id);
  }
}

async function main() {
  const suffix = Date.now();
  const a = await makeStoreWithAdmin(`rls-a-${suffix}`, `rls-a-${suffix}@example.test`);
  const b = await makeStoreWithAdmin(`rls-b-${suffix}`, `rls-b-${suffix}@example.test`);

  const storeIds = [a.store.id, b.store.id];
  const userIds = [a.userId, b.userId];

  try {
    console.log("\nProvjera 1: store_admin A ne vidi radionicu B (izravno preko browsera/RLS)");
    const clientA = await signIn(a.email, a.password);
    const { data: storesVisibleToA, error: storesErrA } = await clientA.from("stores").select("id");
    assert(!storesErrA, `upit uspijeva bez greske (${storesErrA?.message ?? "ok"})`);
    const idsVisibleToA = (storesVisibleToA ?? []).map((s) => s.id);
    assert(idsVisibleToA.includes(a.store.id), "A vidi vlastitu radionicu");
    assert(!idsVisibleToA.includes(b.store.id), "A ne vidi radionicu B");

    const { data: bookingsB, error: bookingsErrB } = await clientA
      .from("bookings")
      .select("id")
      .eq("store_id", b.store.id);
    assert(!bookingsErrB, `upit na bookings B ne baca gresku, samo vraca prazno (${bookingsErrB?.message ?? "ok"})`);
    assert((bookingsB ?? []).length === 0, "A ne vidi nijednu rezervaciju iz B");

    console.log("\nProvjera 2: anon nema pristup nijednoj tablici");
    const anonClient = createClient(SUPABASE_URL, ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: anonStores } = await anonClient.from("stores").select("id");
    assert((anonStores ?? []).length === 0, "anon ne vidi nijednu radionicu");
    const { data: anonBookings } = await anonClient.from("bookings").select("id");
    assert((anonBookings ?? []).length === 0, "anon ne vidi nijednu rezervaciju");

    console.log("\nProvjera 3: authenticated ne moze pozvati poslovne SQL funkcije izravno");
    const { error: rpcError } = await clientA.rpc("create_booking", {
      p_store_id: a.store.id,
      p_service_id: "00000000-0000-0000-0000-000000000000",
      p_start: new Date().toISOString(),
      p_plate: "ZG1234AA",
      p_name: "Test",
      p_phone: null,
      p_source: "PHONE",
      p_hold_id: null,
    });
    assert(
      !!rpcError && /permission denied/i.test(rpcError.message),
      `create_booking vraca permission denied za authenticated (dobiveno: ${rpcError?.message ?? "nema greske"})`,
    );

    const { error: availabilityRpcError } = await clientA.rpc("get_availability", {
      p_store_id: a.store.id,
      p_date: new Date().toISOString().slice(0, 10),
      p_service_id: "00000000-0000-0000-0000-000000000000",
    });
    assert(
      !!availabilityRpcError && /permission denied/i.test(availabilityRpcError.message),
      `get_availability vraca permission denied za authenticated (dobiveno: ${availabilityRpcError?.message ?? "nema greske"})`,
    );
  } finally {
    await cleanup(storeIds, userIds);
  }

  console.log(failures === 0 ? "\nSvi RLS scenariji prolaze." : `\n${failures} provjera nije prosla.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Neocekivana greska u RLS testu:", err);
  process.exit(1);
});
