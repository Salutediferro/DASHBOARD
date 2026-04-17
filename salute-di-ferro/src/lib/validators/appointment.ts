import { z } from "zod";

export const APPOINTMENT_TYPES = [
  "IN_PERSON",
  "VIDEO_CALL",
  "VISIT",
  "FOLLOW_UP",
  "COACHING_SESSION",
] as const;

export const APPOINTMENT_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELED",
  "NO_SHOW",
] as const;

export const PROFESSIONAL_ROLES = ["DOCTOR", "COACH"] as const;

export const appointmentTypeEnum = z.enum(APPOINTMENT_TYPES);
export const appointmentStatusEnum = z.enum(APPOINTMENT_STATUSES);
export const professionalRoleEnum = z.enum(PROFESSIONAL_ROLES);

export const APPOINTMENT_TYPE_LABELS: Record<
  (typeof APPOINTMENT_TYPES)[number],
  string
> = {
  IN_PERSON: "In persona",
  VIDEO_CALL: "Video call",
  VISIT: "Visita",
  FOLLOW_UP: "Follow-up",
  COACHING_SESSION: "Sessione coaching",
};

/**
 * POST /api/appointments
 *
 * Same shape for both patient-initiated and professional-initiated
 * creation — the server fills in the missing side based on the caller's
 * role.
 *   - PATIENT: provides professionalId + professionalRole (must match
 *     an ACTIVE CareRelationship). Server sets patientId = me.id.
 *   - DOCTOR/COACH: provides patientId (must match an ACTIVE
 *     CareRelationship). Server sets professionalId = me.id and
 *     professionalRole from the caller's role.
 */
export const createAppointmentSchema = z
  .object({
    patientId: z.string().uuid().optional(),
    professionalId: z.string().uuid().optional(),
    professionalRole: professionalRoleEnum.optional(),
    startTime: z.string().datetime({ message: "startTime non valido" }),
    endTime: z.string().datetime({ message: "endTime non valido" }).optional(),
    durationMin: z.number().int().min(15).max(240).optional(),
    type: appointmentTypeEnum,
    notes: z.string().max(2000).nullable().optional(),
    meetingUrl: z
      .string()
      .url()
      .nullable()
      .optional()
      .or(z.literal("")),
  })
  .refine((d) => !!d.endTime || !!d.durationMin, {
    message: "Specifica endTime oppure durationMin",
    path: ["endTime"],
  });

export const updateAppointmentSchema = z.object({
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  durationMin: z.number().int().min(15).max(240).optional(),
  type: appointmentTypeEnum.optional(),
  status: appointmentStatusEnum.optional(),
  notes: z.string().max(2000).nullable().optional(),
  meetingUrl: z.string().url().nullable().optional().or(z.literal("")),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
