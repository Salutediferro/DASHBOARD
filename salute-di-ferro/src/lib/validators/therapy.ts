import { z } from "zod";
import { TherapyKind } from "@prisma/client";

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

const nullableTime = z.preprocess(
  (v) => {
    if (v == null) return null;
    if (typeof v !== "string") return v;
    return v === "" ? null : v;
  },
  z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM richiesto")
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

export const createTherapySchema = z.object({
  patientId: z.string().uuid().optional(),
  kind: z.nativeEnum(TherapyKind),
  name: z.string().trim().min(1).max(120),
  dose: nullableString(80),
  frequency: nullableString(120),
  notes: nullableString(500),
  startDate: nullableDate,
  endDate: nullableDate,
  active: z.boolean().optional(),
  reminderTime: nullableTime,
  reminderEnabled: z.boolean().optional(),
});

// `kind` is intentionally absent from the update schema — the service
// layer rejects any attempt to mutate it. Keeping it out of the schema
// means TypeScript callers can't even express the intent.
export const updateTherapySchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  dose: nullableString(80),
  frequency: nullableString(120),
  notes: nullableString(500),
  startDate: nullableDate,
  endDate: nullableDate,
  active: z.boolean().optional(),
  reminderTime: nullableTime,
  reminderEnabled: z.boolean().optional(),
});

export type CreateTherapyInput = z.infer<typeof createTherapySchema>;
export type UpdateTherapyInput = z.infer<typeof updateTherapySchema>;
