import { TZDate } from "@date-fns/tz";
import { describe, expect, it } from "vitest";
import { computeReminderScheduledAt, generateSlotCells } from "./time";

const TZ = "Europe/Zagreb";

describe("generateSlotCells", () => {
  it("generates 30-minute cells between open and close", () => {
    const cells = generateSlotCells({
      date: "2026-06-15",
      openTime: "08:00",
      closeTime: "10:00",
      slotMinutes: 30,
      timezone: TZ,
    });
    expect(cells).toHaveLength(4);
    // 08:00 CEST (summer, UTC+2) => 06:00 UTC
    expect(cells[0].toISOString()).toBe("2026-06-15T06:00:00.000Z");
    expect(cells[3].toISOString()).toBe("2026-06-15T07:30:00.000Z");
  });

  it("accounts for the winter UTC+1 offset", () => {
    const cells = generateSlotCells({
      date: "2026-01-15",
      openTime: "08:00",
      closeTime: "09:00",
      slotMinutes: 30,
      timezone: TZ,
    });
    expect(cells[0].toISOString()).toBe("2026-01-15T07:00:00.000Z");
  });
});

describe("computeReminderScheduledAt — DST (zadnja nedjelja u ozujku/listopadu)", () => {
  it("winter: 18:00 CET (UTC+1) day before a January booking", () => {
    // Booking Monday 2026-01-19 08:00 local -> reminder Sun 2026-01-18 18:00 local (CET, UTC+1)
    const start = new TZDate(2026, 0, 19, 8, 0, 0, TZ);
    const reminder = computeReminderScheduledAt(new Date(start.getTime()), TZ);
    expect(reminder.toISOString()).toBe("2026-01-18T17:00:00.000Z");
  });

  it("summer: 18:00 CEST (UTC+2) day before a July booking", () => {
    const start = new TZDate(2026, 6, 20, 8, 0, 0, TZ);
    const reminder = computeReminderScheduledAt(new Date(start.getTime()), TZ);
    expect(reminder.toISOString()).toBe("2026-07-19T16:00:00.000Z");
  });

  it("spring-forward weekend: DST starts 2026-03-29, booking Monday 2026-03-30", () => {
    // reminder day (2026-03-29) is already CEST (transition happens at 02:00
    // that day) -> 18:00 local = 16:00 UTC, not 17:00 as naive CET math would give.
    const start = new TZDate(2026, 2, 30, 8, 0, 0, TZ);
    const reminder = computeReminderScheduledAt(new Date(start.getTime()), TZ);
    expect(reminder.toISOString()).toBe("2026-03-29T16:00:00.000Z");
  });

  it("fall-back weekend: DST ends 2026-10-25, booking Monday 2026-10-26", () => {
    // reminder day (2026-10-25) is already back to CET by 18:00 (transition
    // happens at 03:00 that day) -> 18:00 local = 17:00 UTC.
    const start = new TZDate(2026, 9, 26, 8, 0, 0, TZ);
    const reminder = computeReminderScheduledAt(new Date(start.getTime()), TZ);
    expect(reminder.toISOString()).toBe("2026-10-25T17:00:00.000Z");
  });
});
