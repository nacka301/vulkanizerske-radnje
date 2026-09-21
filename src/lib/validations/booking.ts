import { z } from "zod";

export const bookingDetailsSchema = z.object({
  storeId: z.uuid(),
  serviceId: z.uuid(),
  holdId: z.uuid(),
  startTime: z.iso.datetime({ offset: true }),
  name: z
    .string()
    .trim()
    .min(2, "Unesite ime i prezime.")
    .max(100, "Ime i prezime je predugacko."),
  phone: z.string().trim().min(6, "Unesite broj mobitela."),
  plate: z
    .string()
    .trim()
    .min(1, "Unesite registarsku oznaku.")
    .max(20, "Registarska oznaka je predugacka."),
  consent: z.literal(true, { error: "Morate prihvatiti pravila privatnosti." }),
  turnstileToken: z.string().min(1, "Captcha nije rijesena."),
});

export type BookingDetailsInput = z.infer<typeof bookingDetailsSchema>;
