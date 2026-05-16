import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email non valida"),
  password: z.string().min(8, "Minimo 8 caratteri"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Body of POST /api/auth/register.
 *
 * PATIENT signup is **invitation-only** — every PATIENT registration must
 * carry a valid `inviteToken`. The token is minted either by:
 *   - the Stripe webhook (`source = STRIPE`), after a customer paid, OR
 *   - a DOCTOR/COACH from inside the app (`source = PROFESSIONAL`).
 *
 * There is no longer a self-serve patient signup path.
 *
 * Only an authenticated ADMIN may create DOCTOR or COACH users.
 * ADMIN creation is not exposed here (seed or manual promotion).
 */
export const registerSchema = z
  .object({
    email: z.string().email("Email non valida"),
    /** PATIENT signup requires a password (used immediately to sign in).
     *  Admin-provisioned DOCTOR / COACH do NOT send one: the server
     *  generates a throw-away password and emails the pro a
     *  password-setup link. */
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
    /** Required for PATIENT, ignored for DOCTOR/COACH. Must match a
     *  PENDING (non-expired) Invitation row. The server completes the
     *  flow based on `Invitation.source`: PROFESSIONAL auto-creates a
     *  CareRelationship; STRIPE leaves the patient unattached. */
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
        "Per registrarti come cliente devi accettare privacy, termini e il trattamento dei dati sanitari.",
      path: ["acceptTerms"],
    },
  )
  .refine(
    (d) => d.role !== "PATIENT" || typeof d.password === "string",
    { message: "Password obbligatoria", path: ["password"] },
  )
  .refine(
    (d) => d.role !== "PATIENT" || typeof d.inviteToken === "string",
    {
      message:
        "Per registrarti serve un invito valido (link via email dopo l'acquisto o invito di un professionista).",
      path: ["inviteToken"],
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Email non valida"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
