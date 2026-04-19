import type { UserProfile } from "@/lib/hooks/use-user";

/**
 * Computes how "complete" a patient profile is and which fields are
 * still missing. The distinction between `critical` and `recommended`
 * drives the UI: critical fields surface as a loud banner (allergies,
 * emergency contact etc. can change treatment), recommended ones only
 * affect the progress percentage.
 */
export type ProfileField = {
  key: keyof UserProfile;
  label: string;
  critical: boolean;
};

const PATIENT_FIELDS: ProfileField[] = [
  { key: "firstName", label: "Nome", critical: false },
  { key: "lastName", label: "Cognome", critical: false },
  { key: "birthDate", label: "Data di nascita", critical: false },
  { key: "sex", label: "Sesso", critical: false },
  { key: "heightCm", label: "Altezza", critical: false },
  { key: "phone", label: "Telefono", critical: true },
  { key: "emergencyContact", label: "Contatto di emergenza", critical: true },
  { key: "allergies", label: "Allergie", critical: true },
  { key: "medicalConditions", label: "Patologie", critical: true },
  { key: "medications", label: "Farmaci in uso", critical: false },
  { key: "injuries", label: "Infortuni / limitazioni", critical: false },
];

export type Completeness = {
  percent: number;
  missing: ProfileField[];
  missingCritical: ProfileField[];
  total: number;
  filled: number;
};

export function computePatientCompleteness(
  profile: UserProfile | null,
): Completeness {
  if (!profile) {
    return {
      percent: 0,
      missing: PATIENT_FIELDS,
      missingCritical: PATIENT_FIELDS.filter((f) => f.critical),
      total: PATIENT_FIELDS.length,
      filled: 0,
    };
  }

  const missing: ProfileField[] = [];
  for (const f of PATIENT_FIELDS) {
    const v = profile[f.key];
    const empty =
      v == null ||
      (typeof v === "string" && v.trim() === "") ||
      (typeof v === "number" && Number.isNaN(v));
    if (empty) missing.push(f);
  }
  const filled = PATIENT_FIELDS.length - missing.length;
  return {
    percent: Math.round((filled / PATIENT_FIELDS.length) * 100),
    missing,
    missingCritical: missing.filter((f) => f.critical),
    total: PATIENT_FIELDS.length,
    filled,
  };
}

// Professional (DOCTOR / COACH) — fields that appear on a public-ish
// profile card and help patients trust the pro.
const PROFESSIONAL_FIELDS: ProfileField[] = [
  { key: "firstName", label: "Nome", critical: false },
  { key: "lastName", label: "Cognome", critical: false },
  { key: "phone", label: "Telefono", critical: false },
  { key: "avatarUrl", label: "Foto profilo", critical: false },
  { key: "bio", label: "Bio pubblica", critical: true },
  { key: "specialties", label: "Specialità", critical: true },
];

export function computeProfessionalCompleteness(
  profile: UserProfile | null,
): Completeness {
  if (!profile) {
    return {
      percent: 0,
      missing: PROFESSIONAL_FIELDS,
      missingCritical: PROFESSIONAL_FIELDS.filter((f) => f.critical),
      total: PROFESSIONAL_FIELDS.length,
      filled: 0,
    };
  }
  const missing: ProfileField[] = [];
  for (const f of PROFESSIONAL_FIELDS) {
    const v = profile[f.key];
    const empty =
      v == null ||
      (typeof v === "string" && v.trim() === "") ||
      (typeof v === "number" && Number.isNaN(v));
    if (empty) missing.push(f);
  }
  const filled = PROFESSIONAL_FIELDS.length - missing.length;
  return {
    percent: Math.round((filled / PROFESSIONAL_FIELDS.length) * 100),
    missing,
    missingCritical: missing.filter((f) => f.critical),
    total: PROFESSIONAL_FIELDS.length,
    filled,
  };
}
