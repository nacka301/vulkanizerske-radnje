// Supabase Edge Function: sms-worker (poglavlje 6).
// Poziva ga pg_cron svake minute preko pg_net.http_post (vidi migraciju
// 20260921110100_sms_worker_cron.sql). Zasticen headerom x-worker-secret,
// usporedba u konstantnom vremenu.
import { createClient } from "jsr:@supabase/supabase-js@2";
import type { SmsProvider } from "./provider.ts";
import { ConsoleSmsProvider } from "./console-provider.ts";
import { InfobipSmsProvider } from "./infobip-provider.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aBytes = enc.encode(a);
  const bBytes = enc.encode(b);
  if (aBytes.length !== bBytes.length) return false;
  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ bBytes[i];
  return diff === 0;
}

async function loadSettings(
  supabase: ReturnType<typeof createClient>,
): Promise<Record<string, string>> {
  const { data, error } = await supabase.from("app_settings").select("key, value");
  if (error) throw error;
  return Object.fromEntries((data ?? []).map((row) => [row.key, row.value as string]));
}

function resolveProvider(settings: Record<string, string>): SmsProvider {
  const provider = settings.sms_provider ?? "console";
  if (provider === "infobip") {
    const baseUrl = settings.infobip_base_url;
    const apiKey = settings.infobip_api_key;
    if (!baseUrl || !apiKey) {
      throw new Error("infobip_base_url/infobip_api_key nisu postavljeni u app_settings");
    }
    return new InfobipSmsProvider(baseUrl, apiKey);
  }
  return new ConsoleSmsProvider();
}

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const settings = await loadSettings(supabase);

  const providedSecret = req.headers.get("x-worker-secret") ?? "";
  const expectedSecret = settings.worker_secret ?? "";
  if (!expectedSecret || !timingSafeEqual(providedSecret, expectedSecret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  await supabase.rpc("recover_stuck_sms");

  const { data: claimed, error: claimError } = await supabase.rpc("claim_pending_sms", {
    p_limit: 50,
  });
  if (claimError) {
    return new Response(JSON.stringify({ error: claimError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const senderId = settings.sms_sender_id ?? "Vulkanizer";
  let provider: SmsProvider;
  try {
    provider = resolveProvider(settings);
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let requeued = 0;
  let failed = 0;

  for (const row of claimed ?? []) {
    try {
      const result = await provider.send(row.to_phone, row.body, senderId);
      await supabase
        .from("sms_outbox")
        .update({ status: "SENT", provider_message_id: result.id, sent_at: new Date().toISOString() })
        .eq("id", row.id);
      sent += 1;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (row.attempts < 3) {
        await supabase
          .from("sms_outbox")
          .update({
            status: "PENDING",
            error: message,
            scheduled_at: new Date(Date.now() + row.attempts * 2 * 60_000).toISOString(),
          })
          .eq("id", row.id);
        requeued += 1;
      } else {
        await supabase.from("sms_outbox").update({ status: "FAILED", error: message }).eq("id", row.id);
        failed += 1;
      }
    }
  }

  return new Response(
    JSON.stringify({ claimed: claimed?.length ?? 0, sent, requeued, failed }),
    { headers: { "Content-Type": "application/json" } },
  );
});
