import type { SmsProvider } from "./provider.ts";

// Poglavlje 8: "U logovima maskiraj PII". Broj mobitela u log-prefiksu se
// maskira; sama poruka (body) namjerno ostaje citljiva jer je ovaj
// provajder u razvoju JEDINI kanal isporuke — maskiranje bi ga ucinilo
// beskorisnim za lokalno testiranje (vidi DECISIONS.md).
function maskPhone(phone: string): string {
  if (phone.length <= 7) return phone;
  return phone.slice(0, 5) + "*".repeat(phone.length - 7) + phone.slice(-2);
}

/** Default provajder za razvoj — ispisuje SMS u log umjesto slanja. */
export class ConsoleSmsProvider implements SmsProvider {
  async send(to: string, body: string, senderId: string): Promise<{ id: string }> {
    const id = crypto.randomUUID();
    console.log(`[sms:console] from=${senderId} to=${maskPhone(to)} id=${id}\n${body}`);
    return await Promise.resolve({ id });
  }
}
