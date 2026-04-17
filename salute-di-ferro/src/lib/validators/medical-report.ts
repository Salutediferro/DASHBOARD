import { z } from "zod";

export const MEDICAL_REPORT_CATEGORIES = [
  "BLOOD_TEST",
  "IMAGING",
  "CARDIOLOGY",
  "ENDOCRINOLOGY",
  "GENERAL_VISIT",
  "PRESCRIPTION",
  "VACCINATION",
  "SURGERY",
  "OTHER",
] as const;

export const medicalReportCategoryEnum = z.enum(MEDICAL_REPORT_CATEGORIES);
export type MedicalReportCategory = z.infer<typeof medicalReportCategoryEnum>;

export const MEDICAL_REPORT_CATEGORY_LABELS: Record<MedicalReportCategory, string> = {
  BLOOD_TEST: "Analisi del sangue",
  IMAGING: "Imaging",
  CARDIOLOGY: "Cardiologia",
  ENDOCRINOLOGY: "Endocrinologia",
  GENERAL_VISIT: "Visita medica",
  PRESCRIPTION: "Prescrizione",
  VACCINATION: "Vaccinazione",
  SURGERY: "Intervento",
  OTHER: "Altro",
};

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
  .nullable()
  .optional();

/**
 * Multipart POST /api/medical-reports. The `file` itself is parsed from
 * FormData separately — this schema validates only the JSON metadata.
 * A DOCTOR uploader may also pass a `patientId` to upload on behalf of a
 * patient; PATIENT uploaders must omit it (server enforces).
 */
export const createMedicalReportSchema = z.object({
  title: z.string().trim().min(1).max(200),
  category: medicalReportCategoryEnum.default("OTHER"),
  notes: z.string().trim().max(2000).nullable().optional(),
  issuedAt: isoDate,
  /** Set by doctor uploaders; ignored for patient uploaders. */
  patientId: z.string().uuid().nullable().optional(),
});

export const updateMedicalReportSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  category: medicalReportCategoryEnum.optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
  issuedAt: isoDate,
});

/**
 * POST /api/medical-reports/[id]/permissions
 * The patient owner grants a professional access to the report.
 */
export const grantPermissionSchema = z.object({
  granteeId: z.string().uuid("granteeId non valido"),
  /** Optional ISO datetime; null/omitted = indefinite. */
  expiresAt: z.string().datetime().nullable().optional(),
});

export type CreateMedicalReportInput = z.infer<typeof createMedicalReportSchema>;
export type UpdateMedicalReportInput = z.infer<typeof updateMedicalReportSchema>;
export type GrantPermissionInput = z.infer<typeof grantPermissionSchema>;
