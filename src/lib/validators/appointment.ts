import { z } from "zod";

export const createAppointmentSchema = z.object({
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  startTime: z.string(),
  endTime: z.string(),
  type: z.enum(["IN_PERSON", "VIDEO_CALL", "CHECK_IN"]),
  notes: z.string().nullable(),
  meetingUrl: z.string().nullable(),
});

export const updateAppointmentSchema = createAppointmentSchema.partial().extend({
  status: z
    .enum(["SCHEDULED", "COMPLETED", "CANCELED", "NO_SHOW"])
    .optional(),
});

export const bookSchema = z.object({
  coachId: z.string(),
  startTime: z.string(),
  type: z.enum(["IN_PERSON", "VIDEO_CALL", "CHECK_IN"]),
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
