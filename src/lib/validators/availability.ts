import { z } from "zod";

const hhmm = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Formato HH:mm richiesto");

const yyyymmdd = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD richiesto");

/**
 * POST /api/availability
 *
 * An AvailabilitySlot is either recurring (dayOfWeek 0..6) or a one-off
 * (date), never both. The startTime/endTime strings are HH:mm and get
 * materialized as @db.Time columns server-side.
 */
export const createAvailabilitySlotSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6).nullable().optional(),
    date: yyyymmdd.nullable().optional(),
    startTime: hhmm,
    endTime: hhmm,
  })
  .refine(
    (d) =>
      (d.dayOfWeek != null && !d.date) ||
      (d.date != null && d.dayOfWeek == null),
    {
      message: "Specifica dayOfWeek (ricorrente) OPPURE date (una tantum)",
      path: ["dayOfWeek"],
    },
  )
  .refine((d) => d.startTime < d.endTime, {
    message: "endTime deve essere successivo a startTime",
    path: ["endTime"],
  });

export type CreateAvailabilitySlotInput = z.infer<
  typeof createAvailabilitySlotSchema
>;
