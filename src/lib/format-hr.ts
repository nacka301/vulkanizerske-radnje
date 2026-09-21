import { TZDate } from "@date-fns/tz";
import { format } from "date-fns";
import { hr as hrLocale } from "date-fns/locale";

export function formatHrDate(iso: string, timezone: string): string {
  return format(new TZDate(iso, timezone), "dd.MM.yyyy.");
}

export function formatHrDateShort(iso: string, timezone: string): string {
  return format(new TZDate(iso, timezone), "dd.MM.");
}

export function formatHrTime(iso: string, timezone: string): string {
  return format(new TZDate(iso, timezone), "HH:mm");
}

export function formatHrWeekdayShort(iso: string, timezone: string): string {
  return format(new TZDate(iso, timezone), "EEE", { locale: hrLocale });
}

export function formatHrDayNumber(iso: string, timezone: string): string {
  return format(new TZDate(iso, timezone), "d");
}

export function formatHrMonthShort(iso: string, timezone: string): string {
  return format(new TZDate(iso, timezone), "LLL", { locale: hrLocale });
}
