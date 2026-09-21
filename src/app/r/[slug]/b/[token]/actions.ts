"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { mapBookingError } from "@/lib/booking-errors";
import type { Tables } from "@/lib/supabase/database.types";

export type ManagedBooking = Tables<"bookings"> & {
  storeName: string;
  storeAddress: string | null;
  storeTimezone: string;
  cancelCutoffMinutes: number;
  serviceName: string;
};

export async function getManagedBooking(token: string): Promise<ManagedBooking | null> {
  const supabase = createAdminClient();

  const { data: booking, error } = await supabase.rpc("get_booking_by_token", { p_token: token });
  if (error || !booking) return null;

  const [{ data: store }, { data: service }] = await Promise.all([
    supabase
      .from("stores")
      .select("name, address, timezone, client_cancel_cutoff_minutes")
      .eq("id", booking.store_id)
      .maybeSingle(),
    supabase.from("services").select("name").eq("id", booking.service_id).maybeSingle(),
  ]);

  return {
    ...booking,
    storeName: store?.name ?? "",
    storeAddress: store?.address ?? null,
    storeTimezone: store?.timezone ?? "Europe/Zagreb",
    cancelCutoffMinutes: store?.client_cancel_cutoff_minutes ?? 120,
    serviceName: service?.name ?? "",
  };
}

type ActionResult = { ok: true } | { ok: false; error: string };

export async function cancelManagedBooking(token: string): Promise<ActionResult> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("client_cancel_booking", { p_token: token });
  if (error) return { ok: false, error: mapBookingError(error.message) };
  return { ok: true };
}
