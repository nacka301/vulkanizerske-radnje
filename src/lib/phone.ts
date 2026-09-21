// "/max" varijanta ukljucuje puna metapodataka potrebna za pouzdanu detekciju
// tipa broja (MOBILE vs FIXED_LINE) — bez nje getType() vraca undefined za
// hrvatske brojeve.
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

/**
 * Normalizira broj mobitela u E.164 format. Default zemlja HR. Vraca `null`
 * ako broj nije valjan ili nije mobilni (poglavlje 4).
 */
export function normalizePhone(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, "HR");
  if (!parsed || !parsed.isValid()) return null;

  const type = parsed.getType();
  if (type !== "MOBILE" && type !== "FIXED_LINE_OR_MOBILE") {
    return null;
  }

  return parsed.number;
}
