import { TZDate } from "@date-fns/tz";

/**
 * Generira pocetne trenutke 30-min celija za dan `date` (YYYY-MM-DD, lokalni
 * datum radionice) izmedju `openTime` i `closeTime` ("HH:mm"), u zoni
 * radionice. Zrcali logiku `get_availability` SQL funkcije.
 */
export function generateSlotCells(params: {
  date: string;
  openTime: string;
  closeTime: string;
  slotMinutes: number;
  timezone: string;
}): Date[] {
  const { date, openTime, closeTime, slotMinutes, timezone } = params;
  const open = new TZDate(`${date}T${openTime}:00`, timezone);
  const close = new TZDate(`${date}T${closeTime}:00`, timezone);

  const cells: Date[] = [];
  const stepMs = slotMinutes * 60_000;
  for (let t = open.getTime(); t < close.getTime(); t += stepMs) {
    cells.push(new Date(t));
  }
  return cells;
}

/**
 * Izracunava kada treba zakazati REMINDER SMS: dan prije termina u 18:00 po
 * lokalnom vremenu radionice (poglavlje 6). Zrcali logiku u
 * create_booking/reschedule_booking SQL funkcijama — koristi se ovdje samo
 * za testiranje ispravnosti oko prijelaza na ljetno/zimsko vrijeme, buduci
 * da stvarno zakazivanje radi Postgres.
 */
export function computeReminderScheduledAt(startTime: Date, timezone: string): Date {
  const local = new TZDate(startTime, timezone);
  const reminderLocal = new TZDate(
    local.getFullYear(),
    local.getMonth(),
    local.getDate() - 1,
    18,
    0,
    0,
    timezone,
  );
  return new Date(reminderLocal.getTime());
}
