import { z } from "zod";

export const profilePatchSchema = z.object({
  firstName: z.string().trim().min(1).max(80).nullable().optional(),
  lastName: z.string().trim().min(1).max(80).nullable().optional(),
  sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD richiesto")
    .nullable()
    .optional(),
  heightCm: z.number().min(80).max(250).nullable().optional(),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^[+\d\s()-]*$/, "Numero non valido")
    .nullable()
    .optional(),
});

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
