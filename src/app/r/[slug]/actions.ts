"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { verifyTurnstile } from "@/lib/turnstile";
import { normalizePlate, isValidPlate } from "@/lib/plate";
import { normalizePhone } from "@/lib/phone";
import { bookingDetailsSchema } from "@/lib/validations/booking";
import { mapBookingError } from "@/lib/booking-errors";
import type { Tables } from "@/lib/supabase/database.types";

export type PublicService = { id: string; code: string; name: string; slots: number };

export type PublicStore = {
  id: string;
  slug: string;
  name: string;
  address: string | null;
  phone: string | null;
  timezone: string;
  slotMinutes: number;
  services: PublicService[];
};

export async function getPublicStore(slug: string): Promise<PublicStore | null> {
  const supabase = createAdminClient();

  const { data: store, error: storeError } = await supabase
    .from("stores")
    .select("id, slug, name, address, phone, timezone, slot_minutes")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (storeError || !store) return null;

  const { data: storeServices, error: servicesError } = await supabase
    .from("store_services")
    .select("slots, services (id, code, name)")
    .eq("store_id", store.id)
    .eq("enabled", true);

  if (servicesError || !storeServices) return null;

  const services: PublicService[] = storeServices
    .filter((row): row is typeof row & { services: NonNullable<typeof row.services> } => row.services !== null)
    .map((row) => ({
      id: row.services.id,
      code: row.services.code,
      name: row.services.name,
      slots: row.slots,
    }));

  return {
    id: store.id,
    slug: store.slug,
    name: store.name,
    address: store.address,
    phone: store.phone,
    timezone: store.timezone,
    slotMinutes: store.slot_minutes,
    services,
  };
}

export type AvailabilitySlot = { startTime: string };

type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

const RATE_LIMIT_MESSAGE = "Previse zahtjeva u kratkom vremenu. Pokusajte za malo.";

export async function getAvailabilityAction(
  storeId: string,
  date: string,
  serviceId: string,
): Promise<ActionResult<AvailabilitySlot[]>> {
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`availability:${ip}`, 10, 60);
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_availability", {
    p_store_id: storeId,
    p_date: date,
    p_service_id: serviceId,
  });

  if (error) return { ok: false, error: mapBookingError(error.message), code: error.message };

  const slots = (data ?? []).filter((row) => row.available).map((row) => ({ startTime: row.start_time }));
  return { ok: true, data: slots };
}

export type HoldResult = { holdId: string; expiresAt: string };

export async function createHoldAction(
  storeId: string,
  serviceId: string,
  startTime: string,
): Promise<ActionResult<HoldResult>> {
  const ip = await getClientIp();
  const allowed = await checkRateLimit(`hold:${ip}`, 5, 60);
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_hold", {
    p_store_id: storeId,
    p_service_id: serviceId,
    p_start: startTime,
  });

  if (error || !data) {
    return { ok: false, error: mapBookingError(error?.message), code: error?.message };
  }

  return { ok: true, data: { holdId: data.id, expiresAt: data.expires_at } };
}

export type CreateBookingInput = {
  storeId: string;
  serviceId: string;
  holdId: string;
  startTime: string;
  name: string;
  phone: string;
  plate: string;
  consent: boolean;
  turnstileToken: string;
};

export type CreatedBooking = Tables<"bookings">;

export async function createBookingAction(input: CreateBookingInput): Promise<ActionResult<CreatedBooking>> {
  const parsed = bookingDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Neispravan unos." };
  }

  const ip = await getClientIp();
  const allowed = await checkRateLimit(`booking:${ip}`, 5, 60);
  if (!allowed) return { ok: false, error: RATE_LIMIT_MESSAGE };

  const captchaOk = await verifyTurnstile(parsed.data.turnstileToken, ip);
  if (!captchaOk) {
    return { ok: false, error: "Provjera captche nije uspjela. Pokusajte ponovno." };
  }

  const plate = normalizePlate(parsed.data.plate);
  if (!isValidPlate(plate)) {
    return { ok: false, error: "Registarska oznaka nije ispravna." };
  }

  const phone = normalizePhone(parsed.data.phone);
  if (!phone) {
    return { ok: false, error: "Broj mobitela nije ispravan." };
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("create_booking", {
    p_store_id: parsed.data.storeId,
    p_service_id: parsed.data.serviceId,
    p_start: parsed.data.startTime,
    p_plate: plate,
    p_name: parsed.data.name,
    p_phone: phone,
    p_source: "ONLINE",
    p_hold_id: parsed.data.holdId,
  });

  if (error || !data) {
    return { ok: false, error: mapBookingError(error?.message), code: error?.message };
  }

  return { ok: true, data };
}
