/**
 * Test konkurentnosti nad lokalnim Supabaseom (poglavlje 9). Pokrece se s
 * `pnpm test:concurrency` dok je `supabase start` aktivan.
 *
 * Scenariji:
 *  1. bays = 1, jedan slobodan termin, 20 paralelnih create_booking poziva
 *     -> tocno 1 uspijeva, ostatak dobiva SLOT_TAKEN.
 *  2. bays = 2, isti termin -> tocno 2 uspijeva.
 *  3. Dvoslotna usluga koja se preklapa s jednoslotnom rezervacijom na
 *     istoj dizalici -> potvrduje da capacity-check gleda svaku 30-min
 *     celiju, ne samo pocetni trenutak.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "http://127.0.0.1:54321";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY nije postavljen. Pokreni `supabase start` i " +
      "izvezi service_role kljuc iz njegovog outputa, npr.:\n" +
      "  SUPABASE_SERVICE_ROLE_KEY=<kljuc> pnpm test:concurrency",
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

async function makeStore(bays: number, slug: string) {
  const { data: store, error } = await admin
    .from("stores")
    .insert({ slug, name: `Concurrency Test ${slug}`, bays })
    .select()
    .single();
  if (error || !store) throw error ?? new Error("store insert failed");

  // otvoreno svaki dan 00:00-23:30 da lead/horizon provjere ne smetaju testu
  const hours = Array.from({ length: 7 }, (_, i) => ({
    store_id: store.id,
    weekday: i + 1,
    open_time: "00:00",
    close_time: "23:30",
    is_closed: false,
  }));
  const { error: hoursError } = await admin.from("store_hours").insert(hours);
  if (hoursError) throw hoursError;

  await admin.from("stores").update({ min_lead_minutes: 0 }).eq("id", store.id);

  const { data: services, error: servicesError } = await admin.from("services").select("*");
  if (servicesError || !services) throw servicesError ?? new Error("no services");

  return { store, services };
}

async function cleanupStore(storeId: string) {
  await admin.from("bookings").delete().eq("store_id", storeId);
  await admin.from("slot_holds").delete().eq("store_id", storeId);
  await admin.from("store_hours").delete().eq("store_id", storeId);
  await admin.from("store_services").delete().eq("store_id", storeId);
  await admin.from("stores").delete().eq("id", storeId);
}

function nextSlotStart(): string {
  // sutra u 10:00 UTC — dovoljno daleko od "sada" i unutar radnog vremena testne radionice
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(10, 0, 0, 0);
  return d.toISOString();
}

async function scenario1SingleBay() {
  console.log("\nScenarij 1: bays=1, 20 paralelnih create_booking za isti termin");
  const { store, services } = await makeStore(1, `concurrency-1bay-${Date.now()}`);
  const service = services.find((s) => s.code === "TIRES_ON_RIMS")!;
  const start = nextSlotStart();

  try {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        admin.rpc("create_booking", {
          p_store_id: store.id,
          p_service_id: service.id,
          p_start: start,
          p_plate: `ZG${1000 + i}AA`,
          p_name: `Test ${i}`,
          p_phone: null,
          p_source: "PHONE",
          p_hold_id: null,
        }),
      ),
    );

    const succeeded = results.filter((r) => !r.error);
    const slotTaken = results.filter((r) => r.error?.message?.includes("SLOT_TAKEN"));
    const otherErrors = results.filter((r) => r.error && !r.error.message?.includes("SLOT_TAKEN"));

    assert(succeeded.length === 1, `tocno 1 uspjeh (dobiveno ${succeeded.length})`);
    assert(slotTaken.length === 19, `19x SLOT_TAKEN (dobiveno ${slotTaken.length})`);
    assert(otherErrors.length === 0, `0 neocekivanih gresaka (dobiveno ${otherErrors.length}: ${otherErrors.map((e) => e.error?.message).join(", ")})`);
  } finally {
    await cleanupStore(store.id);
  }
}

async function scenario2TwoBays() {
  console.log("\nScenarij 2: bays=2, 20 paralelnih create_booking za isti termin");
  const { store, services } = await makeStore(2, `concurrency-2bay-${Date.now()}`);
  const service = services.find((s) => s.code === "TIRES_ON_RIMS")!;
  const start = nextSlotStart();

  try {
    const results = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        admin.rpc("create_booking", {
          p_store_id: store.id,
          p_service_id: service.id,
          p_start: start,
          p_plate: `ZG${2000 + i}BB`,
          p_name: `Test ${i}`,
          p_phone: null,
          p_source: "PHONE",
          p_hold_id: null,
        }),
      ),
    );

    const succeeded = results.filter((r) => !r.error);
    const slotTaken = results.filter((r) => r.error?.message?.includes("SLOT_TAKEN"));

    assert(succeeded.length === 2, `tocno 2 uspjeha (dobiveno ${succeeded.length})`);
    assert(slotTaken.length === 18, `18x SLOT_TAKEN (dobiveno ${slotTaken.length})`);
  } finally {
    await cleanupStore(store.id);
  }
}

async function scenario3OverlappingServices() {
  console.log("\nScenarij 3: bays=1, dvoslotna usluga preklapa se s jednoslotnom rezervacijom");
  const { store, services } = await makeStore(1, `concurrency-overlap-${Date.now()}`);
  const oneSlot = services.find((s) => s.code === "TIRES_ON_RIMS")!;
  const twoSlot = services.find((s) => s.code === "TIRE_REMOUNT")!;

  const base = new Date(nextSlotStart());
  const secondCellStart = new Date(base.getTime() + 30 * 60_000).toISOString();

  try {
    // prva rezervacija zauzima drugu od dvije celije (10:30-11:00)
    const first = await admin.rpc("create_booking", {
      p_store_id: store.id,
      p_service_id: oneSlot.id,
      p_start: secondCellStart,
      p_plate: "ZG9001CC",
      p_name: "Prvi",
      p_phone: null,
      p_source: "PHONE",
      p_hold_id: null,
    });
    assert(!first.error, `prva (jednoslotna) rezervacija uspijeva (${first.error?.message ?? "ok"})`);

    // druga, dvoslotna usluga (10:00-11:00) preklapa se s prvom u celiji 10:30-11:00
    const second = await admin.rpc("create_booking", {
      p_store_id: store.id,
      p_service_id: twoSlot.id,
      p_start: base.toISOString(),
      p_plate: "ZG9002DD",
      p_name: "Drugi",
      p_phone: null,
      p_source: "PHONE",
      p_hold_id: null,
    });
    assert(!!second.error && second.error.message.includes("SLOT_TAKEN"), `preklapajuca dvoslotna rezervacija dobiva SLOT_TAKEN (${second.error?.message ?? "nema greske"})`);
  } finally {
    await cleanupStore(store.id);
  }
}

async function main() {
  await scenario1SingleBay();
  await scenario2TwoBays();
  await scenario3OverlappingServices();

  console.log(failures === 0 ? "\nSvi scenariji konkurentnosti prolaze." : `\n${failures} provjera nije prosla.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error("Neocekivana greska u testu konkurentnosti:", err);
  process.exit(1);
});
