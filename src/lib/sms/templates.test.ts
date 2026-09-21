import { describe, expect, it } from "vitest";
import { buildSmsBody, isGsm7, stripHrDiacritics, type SmsKind } from "./templates";

const TZ = "Europe/Zagreb";
const KINDS: SmsKind[] = ["CONFIRMATION", "REMINDER", "CANCELLATION", "RESCHEDULE"];

// Realisticni podaci (poglavlje 9: "s realnim podacima"): kratka domena,
// kratak slug, 43-znakovni manage_token (32 nasumicna bajta u base64url —
// stvarna duljina koju generira baza, ne izmisljena). Duga imena
// radionica/slugovi mogu gurnuti poruku preko 160 znakova — vidi
// "Poznata ogranicenja" u README.
const REALISTIC_URL = "https://vulk.hr/r/horvat/b/" + "Ab3xQ9kLmZpR7tYwN2vC8sD1fG4hJ6uE0iO5aB9cW-oP7";
const REALISTIC_PARAMS = {
  plate: "ZG1234AB",
  storeName: "Horvat",
  startTime: new Date("2026-11-16T09:00:00Z"),
  timezone: TZ,
  url: REALISTIC_URL,
};

describe("stripHrDiacritics", () => {
  it("removes Croatian diacritics 1:1, keeping string length", () => {
    expect(stripHrDiacritics("Đurđić Čačić Šešić Žižić")).toBe("Durdic Cacic Sesic Zizic");
  });
});

describe("buildSmsBody", () => {
  it("renders the exact CONFIRMATION template", () => {
    const body = buildSmsBody("CONFIRMATION", REALISTIC_PARAMS);
    expect(body).toBe(
      `Vasa rezervacija za ZG1234AB u Horvat je potvrdjena za 16.11. u 10:00. Otkazivanje: ${REALISTIC_URL}`,
    );
  });

  it("renders the exact REMINDER template", () => {
    const body = buildSmsBody("REMINDER", REALISTIC_PARAMS);
    expect(body).toBe(
      `Podsjetnik: sutra u 10:00 imate termin za zamjenu guma (Horvat). Otkazivanje: ${REALISTIC_URL}`,
    );
  });

  it("renders the exact CANCELLATION template (no url)", () => {
    const body = buildSmsBody("CANCELLATION", REALISTIC_PARAMS);
    expect(body).toBe("Vas termin 16.11. u 10:00 (Horvat) je otkazan.");
  });

  it("renders the exact RESCHEDULE template", () => {
    const body = buildSmsBody("RESCHEDULE", REALISTIC_PARAMS);
    expect(body).toBe(
      `Vas termin u Horvat je pomaknut na 16.11. u 10:00. Otkazivanje: ${REALISTIC_URL}`,
    );
  });

  it("strips diacritics from the store name so the whole message is GSM-7", () => {
    const body = buildSmsBody("CANCELLATION", { ...REALISTIC_PARAMS, storeName: "Đurđić" });
    expect(body).toBe("Vas termin 16.11. u 10:00 (Durdic) je otkazan.");
  });

  it("all templates stay within one 160-char GSM-7 SMS segment for realistic data", () => {
    for (const kind of KINDS) {
      const body = buildSmsBody(kind, REALISTIC_PARAMS);
      expect(body.length, `${kind}: "${body}" (${body.length} znakova)`).toBeLessThanOrEqual(160);
      expect(isGsm7(body), `${kind}: "${body}" sadrzi znak izvan GSM-7 skupa`).toBe(true);
    }
  });
});

describe("isGsm7", () => {
  it("accepts plain ASCII", () => {
    expect(isGsm7("Otkazivanje: https://vulkanizer.hr/r/demo/b/abc123")).toBe(true);
  });

  it("rejects characters outside the GSM-7 basic set (e.g. emoji, some diacritics)", () => {
    expect(isGsm7("Termin 🚗")).toBe(false);
    expect(isGsm7("Đuro")).toBe(false);
  });
});
