import { z } from "zod";

export const MEDICAL_REPORT_CATEGORIES = [
  "BLOOD_TEST",
  "IMAGING",
  "VISIT",
  "PRESCRIPTION",
  "OTHER",
] as const;

export const medicalReportCategoryEnum = z.enum(MEDICAL_REPORT_CATEGORIES);

export const createMedicalReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: medicalReportCategoryEnum.default("OTHER"),
  notes: z.string().trim().max(2000).nullable().optional(),
  issuedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .nullable()
    .optional(),
  visibleToCoach: z.boolean().optional(),
});

export const updateMedicalReportSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: medicalReportCategoryEnum.optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  issuedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
    .nullable()
    .optional(),
  visibleToCoach: z.boolean().optional(),
});

export type MedicalReportCategory = z.infer<typeof medicalReportCategoryEnum>;
