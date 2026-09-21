"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireSuperAdmin } from "@/lib/require-super-admin";

type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };

const RESERVED_SLUGS = new Set(["admin", "super", "login", "api", "r"]);
const SLUG_REGEX = /^[a-z0-9-]{3,40}$/;

export async function checkSlugAvailability(slug: string): Promise<{ available: boolean; reason?: string }> {
  await requireSuperAdmin();

  if (!SLUG_REGEX.test(slug)) return { available: false, reason: "format" };
  if (RESERVED_SLUGS.has(slug)) return { available: false, reason: "reserved" };

  const admin = createAdminClient();
  const { data } = await admin.from("stores").select("id").eq("slug", slug).maybeSingle();
  return { available: !data };
}

const DEFAULT_HOURS = [
  { weekday: 1, open_time: "08:00", close_time: "16:00", is_closed: false },
  { weekday: 2, open_time: "08:00", close_time: "16:00", is_closed: false },
  { weekday: 3, open_time: "08:00", close_time: "16:00", is_closed: false },
  { weekday: 4, open_time: "08:00", close_time: "16:00", is_closed: false },
  { weekday: 5, open_time: "08:00", close_time: "16:00", is_closed: false },
  { weekday: 6, open_time: "08:00", close_time: "13:00", is_closed: false },
  { weekday: 7, open_time: "00:00", close_time: "00:00", is_closed: true },
];

export type CreateStoreInput = {
  name: string;
  slug: string;
  address: string;
  phone: string;
  timezone: string;
  bays: number;
};

export async function createStoreAction(input: CreateStoreInput): Promise<ActionResult<{ storeId: string }>> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: store, error } = await admin
    .from("stores")
    .insert({
      name: input.name,
      slug: input.slug,
      address: input.address || null,
      phone: input.phone || null,
      timezone: input.timezone,
      bays: input.bays,
    })
    .select("id")
    .single();

  if (error || !store) {
    if (error?.message.includes("stores_slug_format") || error?.message.includes("stores_slug_not_reserved")) {
      return { ok: false, error: "Link (slug) nije ispravan ili je rezerviran." };
    }
    if (error?.code === "23505") return { ok: false, error: "Link (slug) je vec zauzet." };
    return { ok: false, error: "Kreiranje radionice nije uspjelo." };
  }

  const { error: hoursError } = await admin
    .from("store_hours")
    .insert(DEFAULT_HOURS.map((h) => ({ ...h, store_id: store.id })));

  if (hoursError) return { ok: false, error: "Radionica je kreirana, ali radno vrijeme nije spremljeno." };

  return { ok: true, data: { storeId: store.id } };
}

export type UpdateStoreInput = {
  name: string;
  address: string;
  phone: string;
  timezone: string;
  bays: number;
  active: boolean;
};

export async function updateStoreAction(storeId: string, input: UpdateStoreInput): Promise<ActionResult> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { error } = await admin
    .from("stores")
    .update({
      name: input.name,
      address: input.address || null,
      phone: input.phone || null,
      timezone: input.timezone,
      bays: input.bays,
      active: input.active,
    })
    .eq("id", storeId);

  if (error) return { ok: false, error: "Spremanje nije uspjelo." };
  return { ok: true, data: undefined };
}

function generateTempPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, "x");
}

export async function createStoreAdminAction(
  storeId: string,
  email: string,
): Promise<ActionResult<{ tempPassword: string }>> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const tempPassword = generateTempPassword();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { ok: false, error: createError?.message ?? "Kreiranje korisnika nije uspjelo." };
  }

  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: created.user.id, role: "store_admin", store_id: storeId });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "Kreiranje profila nije uspjelo." };
  }

  return { ok: true, data: { tempPassword } };
}

export type StoreAdminSummary = { id: string; email: string };

export async function listStoreAdminsAction(storeId: string): Promise<ActionResult<StoreAdminSummary[]>> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id")
    .eq("store_id", storeId)
    .eq("role", "store_admin");

  if (error) return { ok: false, error: "Dohvat administratora nije uspio." };

  const admins = await Promise.all(
    (profiles ?? []).map(async (p) => {
      const { data } = await admin.auth.admin.getUserById(p.id);
      return { id: p.id, email: data.user?.email ?? p.id };
    }),
  );

  return { ok: true, data: admins };
}

export type StoreStatsRow = {
  bucket: string;
  store_id: string;
  total: number;
  confirmed: number;
  completed: number;
  no_show: number;
  cancelled: number;
  source_online: number;
  source_phone: number;
  source_walk_in: number;
  no_show_rate: number | null;
};

export async function getStoreStatsAction(
  storeId: string | null,
  from: string,
  to: string,
  group: "day" | "month",
): Promise<ActionResult<StoreStatsRow[]>> {
  await requireSuperAdmin();
  const admin = createAdminClient();

  const { data, error } = await admin.rpc("store_stats", {
    p_store_id: storeId,
    p_from: from,
    p_to: to,
    p_group: group,
  });

  if (error) return { ok: false, error: "Dohvat statistike nije uspio." };
  return { ok: true, data: data ?? [] };
}
