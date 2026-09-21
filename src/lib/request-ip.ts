import "server-only";
import { headers } from "next/headers";

/** Najbolja procjena IP-a klijenta iz proxy headera (poglavlje 7: rate limit po IP-u). */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwardedFor = h.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]!.trim();
  }
  return h.get("x-real-ip") ?? "unknown";
}
