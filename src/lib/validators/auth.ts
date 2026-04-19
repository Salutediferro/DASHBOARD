import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Minimo 8 caratteri"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Body of POST /api/auth/register.
 *
 * Anyone may register as PATIENT.
 * Only an authenticated ADMIN may create DOCTOR or COACH users.
 * ADMIN creation is not exposed here (seed or manual promotion).
 */
export const registerSchema = z
  .object({
    email: z.string().email("Email non valida"),
    /** PATIENT self-signup requires a password (used immediately to
     *  sign in). Admin-provisioned DOCTOR / COACH do NOT send one:
     *  the server generates a throw-away password and emails the pro
     *  a password-setup link. */
    password: z.string().min(8, "Minimo 8 caratteri").optional(),
    confirmPassword: z.string().optional(),
    firstName: z.string().trim().min(1, "Nome obbligatorio").max(80),
    lastName: z.string().trim().min(1, "Cognome obbligatorio").max(80),
    sex: z.enum(["MALE", "FEMALE", "OTHER"]).nullable().optional(),
    birthDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Formato YYYY-MM-DD")
      .nullable()
      .optional(),
    role: z.enum(["DOCTOR", "COACH", "PATIENT"]),
    /** Optional invite token: when present, must be PENDING for the given
     *  email; the server then auto-creates a CareRelationship with the
     *  inviting professional. Only meaningful when role=PATIENT. */
    inviteToken: z.string().min(10).max(200).optional(),
    /** Art. 9 GDPR requires explicit consent for processing health data.
     *  Enforced server-side: reject the registration if false/missing on
     *  a PATIENT signup. Not required for admin-provisioned DOCTOR/COACH
     *  since they're not subjects of health-data processing themselves. */
    acceptTerms: z.boolean().optional(),
    acceptHealthDataProcessing: z.boolean().optional(),
  })
  .refine(
    (d) => !d.confirmPassword || d.password === d.confirmPassword,
    { message: "Le password non coincidono", path: ["confirmPassword"] },
  )
  .refine(
    (d) =>
      d.role !== "PATIENT" ||
      (d.acceptTerms === true && d.acceptHealthDataProcessing === true),
    {
      message:
        "Per registrarti come paziente devi accettare privacy, termini e il trattamento dei dati sanitari.",
      path: ["acceptTerms"],
    },
  )
  .refine(
    (d) => d.role !== "PATIENT" || typeof d.password === "string",
    { message: "Password obbligatoria", path: ["password"] },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
