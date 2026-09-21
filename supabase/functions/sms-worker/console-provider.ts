import type { SmsProvider } from "./provider.ts";

/** Default provajder za razvoj — ispisuje SMS u log umjesto slanja. */
export class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, body: string, senderId: string): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    console.log(`[sms:console] from=${senderId} to=${to} id=${id}\n${body}`);
    return await Promise.resolve({ id });
  }
}
