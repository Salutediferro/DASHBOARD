import { z } from "zod";

const nullableString = (max: number) =>
  z.string().trim().max(max).nullable().optional();

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

  // Goals
  primaryGoal: z
    .enum(["MASS", "CUTTING", "STRENGTH", "HEALTH", "SPORT", "RECOMP"])
    .nullable()
    .optional(),
  fitnessLevel: z
    .enum(["BEGINNER", "INTERMEDIATE", "ADVANCED", "ATHLETE"])
    .nullable()
    .optional(),
  weeklyActivityHours: z.number().min(0).max(100).nullable().optional(),

  // Health
  medicalConditions: nullableString(2000),
  allergies: nullableString(2000),
  medications: nullableString(2000),
  injuries: nullableString(2000),
});

export type ProfilePatch = z.infer<typeof profilePatchSchema>;
