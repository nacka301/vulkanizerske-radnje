/**
 * Normalizacija i validacija registarske oznake (poglavlje 4).
 * Ogledalo SQL provjere `bookings_plate_format` — mora ostati u sync.
 */

const PLATE_REGEX = /^[A-Z0-9]{4,10}$/;
const DISPLAY_REGEX = /^([A-Z]{2})(\d{3,4})([A-Z]{1,2})$/;

export function normalizePlate(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidPlate(plate: string): boolean {
  return PLATE_REGEX.test(plate);
}

export function formatPlateDisplay(plate: string): string {
  const match = plate.match(DISPLAY_REGEX);
  if (!match) return plate;
  const [, county, number, suffix] = match;
  return `${county} ${number}-${suffix}`;
}
