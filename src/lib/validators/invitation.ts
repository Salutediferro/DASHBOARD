import { z } from "zod";

/**
 * Body of POST /api/invitations.
 *
 * Only authenticated DOCTOR or COACH users may create invitations (the
 * server enforces this; the caller's role determines the
 * `professionalRole` stamped onto the invite — COACH → COACH invite,
 * DOCTOR → DOCTOR invite). ADMIN users should provision pros via
 * /dashboard/admin/users/new instead.
 */
export const createInvitationSchema = z.object({
  email: z.string().email("Email non valida").optional().or(z.literal("")),
  firstName: z.string().trim().max(80).optional().or(z.literal("")),
  lastName: z.string().trim().max(80).optional().or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  /** Days until expiry; clamp [1, 30]. Default 14. */
  expiresInDays: z.number().int().min(1).max(30).optional(),
});

export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
