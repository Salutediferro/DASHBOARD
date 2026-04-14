import { z } from "zod";

export const APPOINTMENT_TYPES = [
  "IN_PERSON",
  "VIDEO_CALL",
  "VISIT",
  "FOLLOW_UP",
  "COACHING_SESSION",
] as const;

export const PROFESSIONAL_ROLES = ["DOCTOR", "COACH"] as const;

export const appointmentTypeEnum = z.enum(APPOINTMENT_TYPES);
export const professionalRoleEnum = z.enum(PROFESSIONAL_ROLES);

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1),
  patientName: z.string().min(1),
  professionalRole: professionalRoleEnum,
  startTime: z.string(),
  endTime: z.string(),
  type: appointmentTypeEnum,
  notes: z.string().nullable(),
  meetingUrl: z.string().nullable(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z
    .enum(["SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"])
    .optional(),
});

export const bookSchema = z.object({
  professionalId: z.string(),
  professionalRole: professionalRoleEnum,
  startTime: z.string(),
  type: appointmentTypeEnum,
  durationMin: z.number().int().min(15).max(180),
  notes: z.string().nullable().optional(),
});

export const availabilityDaySchema = z.object({
  start: z.string(),
  end: z.string(),
  closed: z.boolean(),
});

export const availabilitySchema = z.record(
  z.string(),
  availabilityDaySchema,
);
