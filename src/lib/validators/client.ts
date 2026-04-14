import { z } from "zod";

export const createClientSchema = z.object({
  firstName: z.string().min(1, "Nome obbligatorio"),
  lastName: z.string().min(1, "Cognome obbligatorio"),
  email: z.string().email("Email non valida"),
  phone: z.string().optional().or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
  plan: z.enum(["Basic", "Premium", "VIP"]),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export const updateClientSchema = createClientSchema.partial().extend({
  status: z.enum(["ACTIVE", "PAUSED", "ARCHIVED"]).optional(),
});
export type UpdateClientInput = z.infer<typeof updateClientSchema>;
