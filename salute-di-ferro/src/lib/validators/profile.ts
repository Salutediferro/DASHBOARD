import { z } from "zod";

/**
 * Lenient nullable string: accepts empty strings from the UI and normalizes
 * them to `null` so PATCH semantics stay clean (empty = cleared).
 */
const nullableString = (max: number) =>
  z.preprocess(
    (v) => {
      if (v == null) return null;
      if (typeof v !== "string") return v;
      const trimmed = v.trim();
      return trimmed === "" ? null : trimmed;
    },
    z.string().max(max).nullable().optional(),
  );

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

const nullableNumber = (min: number, max: number) =>
  z.preprocess(
    (v) => {
      if (v == null || v === "") return null;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : null;
    },
    z.number().min(min).max(max).nullable().optional(),
  );

export const profilePatchSchema = z.object({
  firstName: nullableString(80),
  lastName: nullableString(80),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  birthDate: nullableDate,
  heightCm: nullableNumber(80, 250),
  phone: z.preprocess(
    (v) => {
      if (v == null) return null;
      if (typeof v !== "string") return v;
      const t = v.trim();
      return t === "" ? null : t;
    },
    z
      .string()
      .max(30)
      .regex(/^[+\d\s()-]*$/, "Numero non valido")
      .nullable()
      .optional(),
  ),
  taxCode: nullableString(20),
  emergencyContact: nullableString(200),

  // Clinical profile (patient only — optional for other roles)
  medicalConditions: nullableString(2000),
  allergies: nullableString(2000),
  medications: nullableString(2000),
  injuries: nullableString(2000),

  // Public professional profile (DOCTOR/COACH only — ignored otherwise)
  bio: nullableString(2000),
  specialties: nullableString(500),
});

export type ProfilePatch = z.infer<typeof profilePatchSchema>;

/**
 * Lenient companion schema for the client profile form (react-hook-form).
 * Keeps field types as plain `string | null` / `number | null` (no preprocess)
 * so RHF can infer the input type without hitting `unknown`. The strict
 * `profilePatchSchema` above is still the authoritative server-side guard.
 */
export const profileFormSchema = z.object({
  firstName: z.string().max(80).nullable(),
  lastName: z.string().max(80).nullable(),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable(),
  birthDate: z.string().nullable(),
  heightCm: z.number().nullable(),
  phone: z.string().max(30).nullable(),
  taxCode: z.string().max(20).nullable(),
  emergencyContact: z.string().max(200).nullable(),
  medicalConditions: z.string().max(2000).nullable(),
  allergies: z.string().max(2000).nullable(),
  medications: z.string().max(2000).nullable(),
  injuries: z.string().max(2000).nullable(),
  bio: z.string().max(2000).nullable(),
  specialties: z.string().max(500).nullable(),
});

export type ProfileFormInput = z.infer<typeof profileFormSchema>;
