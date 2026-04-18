import { z } from "zod";

const rating = z.preprocess(
  (v) => {
    if (v == null || v === "") return null;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) ? n : null;
  },
  z.number().int().min(1).max(5).nullable().optional(),
);

export const upsertSymptomLogSchema = z.object({
  /** YYYY-MM-DD — defaults to today on server if omitted. */
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD richiesto")
    .optional(),
  mood: rating,
  energy: rating,
  sleepQuality: rating,
  symptoms: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  notes: z
    .string()
    .max(1000)
    .nullable()
    .optional(),
});

export type UpsertSymptomLogInput = z.infer<typeof upsertSymptomLogSchema>;
