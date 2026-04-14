import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Minimo 8 caratteri"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z.string().min(2, "Inserisci il tuo nome"),
    email: z.string().email("Email non valida"),
    password: z.string().min(8, "Minimo 8 caratteri"),
    confirmPassword: z.string(),
    role: z.enum(["COACH", "CLIENT"]),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Le password non coincidono",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
