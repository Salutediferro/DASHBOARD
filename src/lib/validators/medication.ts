import { z } from "zod";

const nullableDate = z.preprocess(
  (v) => {
    if (v == null) return null;
    if (typeof v !== "string") return v;
    return v === "" ? null : v;
  },
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD richiesto")
    .nullable()
    .optional(),
);

const nullableString = (max: number) =>
  z.preprocess(
    (v) => {
      if (v == null) return null;
      if (typeof v !== "string") return v;
      const t = v.trim();
      return t === "" ? null : t;
    },
    z.string().max(max).nullable().optional(),
  );

export const createMedicationSchema = z.object({
  name: z.string().trim().min(1).max(120),
  dose: nullableString(80),
  frequency: nullableString(120),
  notes: nullableString(500),
  startDate: nullableDate,
  endDate: nullableDate,
  active: z.boolean().optional(),
});

export const updateMedicationSchema = createMedicationSchema.partial().extend({
  active: z.boolean().optional(),
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;
export type UpdateMedicationInput = z.infer<typeof updateMedicationSchema>;
