import { describe, expect, it } from "vitest";
import { buildSmsBody, isGsm7, stripHrDiacritics, type SmsKind } from "./templates";

const TZ = "Europe/Zagreb";
const KINDS: SmsKind[] = ["CONFIRMATION", "REMINDER", "CANCELLATION", "RESCHEDULE"];

// Realisticni podaci (poglavlje 9: "s realnim podacima"): kratka domena,
// kratak slug, 16-znakovni manage_token (12 nasumicnih bajtova u
// base64url — stvarna duljina koju generira baza, ne izmisljena; smanjeno
// s izvornih 32 bajta/43 znaka da poruka stane u jedan GSM-7 segment i na
// dugoj produkcijskoj *.vercel.app domeni, ne samo na kratkoj domeni iz
// ovog testa — vidi DECISIONS.md). Duga imena radionica/slugovi svejedno
// mogu gurnuti poruku preko 160 znakova — vidi "Poznata ogranicenja" u
// README.
const REALISTIC_URL = "https://vulk.hr/r/horvat/b/" + "Ab3xQ9kLmZpR7tY-";
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
      `Rezervacija ZG1234AB u Horvat potvrdjena 16.11. u 10:00. Otkazi: ${REALISTIC_URL}`,
    );
  });

  it("renders the exact REMINDER template", () => {
    const body = buildSmsBody("REMINDER", REALISTIC_PARAMS);
    expect(body).toBe(
      `Podsjetnik: sutra u 10:00 termin za zamjenu guma (Horvat). Otkazi: ${REALISTIC_URL}`,
    );
  });

  it("renders the exact CANCELLATION template (no url)", () => {
    const body = buildSmsBody("CANCELLATION", REALISTIC_PARAMS);
    expect(body).toBe("Vas termin 16.11. u 10:00 (Horvat) je otkazan.");
  });

  it("renders the exact RESCHEDULE template", () => {
    const body = buildSmsBody("RESCHEDULE", REALISTIC_PARAMS);
    expect(body).toBe(
      `Termin u Horvat pomaknut na 16.11. u 10:00. Otkazi: ${REALISTIC_URL}`,
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

  // Dosadasnja produkcijska domena je duga podijeljena *.vercel.app domena
  // (nema kupljene domene), ne kratka domena kao gore — s izvornim
  // 43-znakovnim tokenom to je gurnulo CONFIRMATION na 193 znakova (2 SMS
  // segmenta, dvostruki trosak kod Infobipa). Ovaj test ponavlja isti izracun
  // s pravom (dugom) domenom da regresija ne prodje neopazeno ako netko opet
  // produzi token ili tekst predloska.
  const PRODUCTION_LENGTH_URL =
    "https://vulkanizerske-radnje-app-vaki.vercel.app/r/demo/b/" + "Ab3xQ9kLmZpR7tY-";

  it("CONFIRMATION stays within one segment even on the long *.vercel.app production domain", () => {
    const body = buildSmsBody("CONFIRMATION", {
      ...REALISTIC_PARAMS,
      storeName: "Vulkanizer Demo",
      url: PRODUCTION_LENGTH_URL,
    });
    expect(body.length, `"${body}" (${body.length} znakova)`).toBeLessThanOrEqual(160);
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
