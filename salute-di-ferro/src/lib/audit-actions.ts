/**
 * Canonical audit action names, split out from `lib/audit.ts` so client
 * components (admin audit page filter dropdown) can import the list
 * without dragging Prisma + `pg` into the browser bundle.
 *
 * Keep this file as a leaf: zero imports, no side effects.
 */
export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "PROFILE_UPDATE",
  "AVATAR_UPDATE",
  "MEDICAL_REPORT_UPLOAD",
  "MEDICAL_REPORT_VIEW",
  "MEDICAL_REPORT_UPDATE",
  "MEDICAL_REPORT_DELETE",
  "REPORT_PERMISSION_GRANT",
  "REPORT_PERMISSION_REVOKE",
  "BIOMETRIC_CREATE",
  "BIOMETRIC_UPDATE",
  "BIOMETRIC_DELETE",
  "APPOINTMENT_CREATE",
  "APPOINTMENT_UPDATE",
  "APPOINTMENT_CANCEL",
  "AVAILABILITY_CREATE",
  "AVAILABILITY_DELETE",
  "USER_REGISTER",
  "USER_SOFT_DELETE",
  "USER_RESTORE",
  "USER_ROLE_CHANGE",
  "USER_PASSWORD_RESET",
  "USER_EXPORT",
  "ADMIN_USER_EXPORT",
  "USER_HARD_DELETE",
  "ADMIN_USER_PROVISION",
  "INVITATION_CREATE",
  "INVITATION_REVOKE",
  "INVITATION_RESEND",
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
