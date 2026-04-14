import { z } from "zod";

export const FAQ_CATEGORIES = [
  "ACCOUNT",
  "BILLING",
  "TRAINING",
  "NUTRITION",
  "TECHNICAL",
] as const;

export const escalationCategorySchema = z.enum([...FAQ_CATEGORIES, "OTHER"]);

export const escalateInputSchema = z.object({
  clientId: z.string().optional(),
  conversationId: z.string().optional(),
  conversationSummary: z.string().min(5).max(4000),
  category: escalationCategorySchema,
});

export type EscalateInput = z.infer<typeof escalateInputSchema>;

export const escalationPatchSchema = z.object({
  id: z.string().min(1),
  action: z.enum(["RESOLVE", "REPLY"]),
  message: z.string().min(1).max(4000).optional(),
});

export type EscalationPatchInput = z.infer<typeof escalationPatchSchema>;
