/**
 * Mapira kodove gresaka iz SQL funkcija (poglavlje 5) u hrvatske poruke za
 * korisnika.
 */
const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  SLOT_TAKEN: "Termin je upravo zauzet, odaberite drugi.",
  OUTSIDE_HOURS: "Odabrani termin je izvan radnog vremena radionice.",
  TOO_SOON: "Odabrani termin je prebrzo od sada, odaberite kasniji.",
  TOO_FAR: "Odabrani termin je predaleko u buducnosti.",
  BLOCKED: "Radionica je zatvorena u odabranom terminu.",
  PHONE_LIMIT: "Dosegnut je maksimalan broj aktivnih rezervacija za ovaj broj mobitela.",
  STORE_NOT_FOUND: "Radionica ili usluga nije pronadjena.",
  INVALID_TRANSITION: "Ova promjena statusa trenutno nije moguca.",
  CUTOFF_PASSED: "Rok za otkazivanje ovog termina je prosao.",
  INVALID_GROUP: "Neispravan parametar za statistiku.",
};

export function mapBookingError(rawMessage: string | undefined | null): string {
  if (!rawMessage) return "Doslo je do greske. Pokusajte ponovno.";
  const code = rawMessage.trim();
  return BOOKING_ERROR_MESSAGES[code] ?? "Doslo je do greske. Pokusajte ponovno.";
}

export function isBookingErrorCode(rawMessage: string | undefined | null, code: string): boolean {
  return rawMessage?.trim() === code;
}
