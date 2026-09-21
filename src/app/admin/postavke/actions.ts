"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStoreAdmin } from "@/lib/require-store-admin";

type ActionResult = { ok: true } | { ok: false; error: string };

function mapDbError(error: { message: string } | null): string {
  if (!error) return "Doslo je do greske.";
  if (error.message.includes("store_hours_aligned")) return "Radno vrijeme mora biti poravnato na 30 minuta.";
  if (error.message.includes("store_hours_order_check")) return "Vrijeme zatvaranja mora biti nakon vremena otvaranja.";
  if (error.message.includes("stores_bays_check")) return "Broj dizalica mora biti barem 1.";
  if (error.message.includes("store_services_slots_check")) return "Trajanje usluge mora biti izmedju 1 i 8 termina.";
  if (error.message.includes("slot_blocks_range_check")) return "Kraj blokade mora biti nakon pocetka.";
  return "Spremanje nije uspjelo. Provjerite unesene vrijednosti.";
}

export type HourInput = {
  weekday: number;
  openTime: string;
  closeTime: string;
  isClosed: boolean;
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

export async function addBlockAction(input: {
  startsAt: string;
  endsAt: string;
  reason: string;
}): Promise<ActionResult> {
  const { storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("slot_blocks").insert({
    store_id: storeId,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    reason: input.reason || null,
  });

  if (error) return { ok: false, error: mapDbError(error) };
  return { ok: true };
}

export async function deleteBlockAction(blockId: string): Promise<ActionResult> {
  const { storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { error } = await admin.from("slot_blocks").delete().eq("id", blockId).eq("store_id", storeId);
  if (error) return { ok: false, error: mapDbError(error) };
  return { ok: true };
}
