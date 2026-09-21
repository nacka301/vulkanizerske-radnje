import { TZDate } from "@date-fns/tz";

/**
 * SMS predlosci (poglavlje 6). Ova TS verzija postoji zbog Vitest testova
 * (duljina, GSM-7 skup znakova) i moguce upotrebe za pregled u adminu;
 * stvarno slanje SMS-a kompozira tijelo u Postgresu (`build_sms_body` SQL
 * funkcija, supabase/migrations/20260921100500_fn_booking_core.sql) — obje
 * verzije moraju ostati doslovno identicne.
 */
export type SmsKind = "CONFIRMATION" | "REMINDER" | "CANCELLATION" | "RESCHEDULE";

export interface SmsTemplateParams {
  plate: string;
  storeName: string;
  startTime: Date;
  timezone: string;
  url?: string;
}

const DIACRITICS_MAP: Record<string, string> = {
  č: "c",
  ć: "c",
  ž: "z",
  š: "s",
  đ: "d",
  Č: "C",
  Ć: "C",
  Ž: "Z",
  Š: "S",
  Đ: "D",
};

export function stripHrDiacritics(text: string): string {
  return text.replace(/[čćžšđČĆŽŠĐ]/g, (ch) => DIACRITICS_MAP[ch] ?? ch);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function formatHrDate(date: TZDate): string {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.`;
}

function formatHrTime(date: TZDate): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function buildSmsBody(kind: SmsKind, params: SmsTemplateParams): string {
  const local = new TZDate(params.startTime, params.timezone);
  const store = stripHrDiacritics(params.storeName);
  const date = formatHrDate(local);
  const time = formatHrTime(local);
  const url = params.url ?? "";

  switch (kind) {
    case "CONFIRMATION":
      return `Vasa rezervacija za ${params.plate} u ${store} je potvrdjena za ${date} u ${time}. Otkazivanje: ${url}`;
    case "REMINDER":
      return `Podsjetnik: sutra u ${time} imate termin za zamjenu guma (${store}). Otkazivanje: ${url}`;
    case "CANCELLATION":
      return `Vas termin ${date} u ${time} (${store}) je otkazan.`;
    case "RESCHEDULE":
      return `Vas termin u ${store} je pomaknut na ${date} u ${time}. Otkazivanje: ${url}`;
  }
}

// GSM 03.38 osnovni alfabet (default alphabet) — jedan znak = jedan
// GSM-7 septet. Poruka koja koristi samo ove znakove staje u jedan SMS
// segment do 160 znakova.
const GSM7_BASIC =
  '@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\x1bÆæßÉ !"#¤%&\'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà';

const GSM7_SET = new Set(GSM7_BASIC);

export function isGsm7(text: string): boolean {
  return [...text].every((ch) => GSM7_SET.has(ch));
}
