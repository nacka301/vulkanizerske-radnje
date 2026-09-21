"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireStoreAdmin } from "@/lib/require-store-admin";
import { mapBookingError } from "@/lib/booking-errors";
import { normalizePhone } from "@/lib/phone";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

export async function setBookingStatusAction(
  bookingId: string,
  status: "COMPLETED" | "NO_SHOW" | "CANCELLED",
  notify: boolean,
): Promise<ActionResult> {
  const { userId, storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { error } = await admin.rpc("set_booking_status", {
    p_store_id: storeId,
    p_booking_id: bookingId,
    p_status: status,
    p_notify: notify,
    p_actor: userId,
  });

  if (error) return { ok: false, error: mapBookingError(error.message) };
  return { ok: true, data: undefined };
}

export async function rescheduleBookingAction(
  bookingId: string,
  newStart: string,
  notify: boolean,
): Promise<ActionResult> {
  const { userId, storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { error } = await admin.rpc("reschedule_booking", {
    p_store_id: storeId,
    p_booking_id: bookingId,
    p_new_start: newStart,
    p_notify: notify,
    p_actor: userId,
  });

  if (error) return { ok: false, error: mapBookingError(error.message) };
  return { ok: true, data: undefined };
}

export async function quickEntryAction(input: {
  serviceId: string;
  startTime: string;
  name: string;
  phone: string;
  notes: string;
}): Promise<ActionResult> {
  const { storeId } = await requireStoreAdmin();

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Ime i prezime su obavezni." };

  let phone: string | null = null;
  if (input.phone.trim()) {
    phone = normalizePhone(input.phone);
    if (!phone) return { ok: false, error: "Broj mobitela nije ispravan." };
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("create_booking", {
    p_store_id: storeId,
    p_service_id: input.serviceId,
    p_start: input.startTime,
    p_plate: null as unknown as string,
    p_name: name,
    p_phone: phone ?? (null as unknown as string),
    p_source: "PHONE",
    p_hold_id: undefined,
    p_notes: input.notes.trim() || undefined,
  });

  if (error) return { ok: false, error: mapBookingError(error.message) };
  return { ok: true, data: undefined };
}

export type AdminAvailabilitySlot = { startTime: string };

export async function adminAvailabilityAction(
  date: string,
  serviceId: string,
): Promise<ActionResult<AdminAvailabilitySlot[]>> {
  const { storeId } = await requireStoreAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("get_availability", {
    p_store_id: storeId,
    p_date: date,
    p_service_id: serviceId,
  });

  if (error) return { ok: false, error: mapBookingError(error.message) };

  const slots = (data ?? []).filter((row) => row.available).map((row) => ({ startTime: row.start_time }));
  return { ok: true, data: slots };
}
