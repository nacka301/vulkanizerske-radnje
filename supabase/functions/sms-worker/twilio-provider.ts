import type { SmsProvider } from "./provider.ts";

/**
 * Twilio provajder. `senderId` mora biti Twilio broj ili odobreni
 * alfanumericki Sender ID (ovisi o regiji/racunu) — nije pod nasom
 * kontrolom, samo se prosljeduje kao "From".
 */
export class TwilioSmsProvider implements SmsProvider {
  constructor(
    private accountSid: string,
    private authToken: string,
  ) {}

  async send(to: string, body: string, senderId: string): Promise<{ id: string }> {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
    const auth = btoa(`${this.accountSid}:${this.authToken}`);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: to, From: senderId, Body: body }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(typeof data?.message === "string" ? data.message : `Twilio greska ${res.status}`);
    }

    return { id: data.sid as string };
  }
}
