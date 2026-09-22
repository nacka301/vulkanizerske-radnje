import type { SmsProvider } from "./provider.ts";

type InfobipMessageStatus = {
  groupId: number;
  groupName: string;
  id: number;
  name: string;
  description: string;
};

type InfobipMessageResult = {
  to: string;
  status: InfobipMessageStatus;
  messageId: string;
};

type InfobipSendResponse = {
  messages: InfobipMessageResult[];
};

/** Infobip provajder (REST API, "Send SMS message" — /sms/2/text/advanced). */
export class InfobipSmsProvider implements SmsProvider {
  constructor(
    private baseUrl: string,
    private apiKey: string,
  ) {}

  async send(to: string, body: string, senderId: string): Promise<{ id: string }> {
    const url = `${this.baseUrl}/sms/2/text/advanced`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `App ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        messages: [{ from: senderId, destinations: [{ to }], text: body }],
      }),
    });

    const data = (await res.json()) as InfobipSendResponse;

    if (!res.ok) {
      throw new Error(data.messages?.[0]?.status?.description ?? `Infobip greska ${res.status}`);
    }

    const message = data.messages?.[0];
    if (!message) {
      throw new Error("Infobip odgovor ne sadrzi poruku.");
    }

    if (message.status.groupName === "REJECTED") {
      throw new Error(message.status.description || "Infobip je odbio poruku.");
    }

    return { id: message.messageId };
  }
}
