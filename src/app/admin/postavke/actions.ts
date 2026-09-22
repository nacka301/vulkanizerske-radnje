"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStoreAdmin } from "@/lib/require-store-admin";

type ActionResult = { ok: true } | { ok: false; error: string };

function mapDbError(error: { message: string } | null): string {
  if (!error) return "Doslo je do greske.";
  if (error.message.includes("store_hours_aligned")) return "Radno vrijeme mora biti poravnato na 30 minuta.";
  if (error.message.includes("store_hours_order_check")) return "Vrijeme zatvaranja mora biti nakon vremena otvaranja.";
  if (error.message.includes("store_hours_break_order_check")) return "Kraj pauze mora biti nakon pocetka pauze.";
  if (error.message.includes("store_hours_break_within_hours_check")) return "Pauza mora biti unutar radnog vremena.";
  if (error.message.includes("store_hours_break_aligned")) return "Pauza mora biti poravnata na 30 minuta.";
  if (error.message.includes("stores_bays_check")) return "Broj dizalica mora biti barem 1.";
  if (error.message.includes("store_services_slots_check")) return "Trajanje usluge mora biti izmedju 1 i 8 termina.";
  return "Spremanje nije uspjelo. Provjerite unesene vrijednosti.";
}

export type HourInput = {
  weekday: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
  breakStart: string | null;
  breakEnd: string | null;
};

export async function updateHoursAction(hours: HourInput[]): Promise<ActionResult> {
  const { storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("store_hours").upsert(
    hours.map((h) => ({
      store_id: storeId,
      weekday: h.weekday,
      open_time: h.openTime,
      close_time: h.closeTime,
      is_closed: h.isClosed,
      break_start: h.breakStart,
      break_end: h.breakEnd,
    })),
    { onConflict: "store_id,weekday" },
  );

  if (error) return { ok: false, error: mapDbError(error) };
  return { ok: true };
}

export async function updateBaysAction(bays: number): Promise<ActionResult> {
  const { storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("stores").update({ bays }).eq("id", storeId);
  if (error) return { ok: false, error: mapDbError(error) };
  return { ok: true };
}

export async function updateServiceAction(
  serviceId: string,
  input: { enabled: boolean; slots: number },
): Promise<ActionResult> {
  const { storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("store_services")
    .update({ enabled: input.enabled, slots: input.slots })
    .eq("store_id", storeId)
    .eq("service_id", serviceId);

  if (error) return { ok: false, error: mapDbError(error) };
  return { ok: true };
}
