-- Patient invitation flow: DOCTOR or COACH generates a one-shot token URL
-- that a new patient uses at /register?invite=<token> to sign up; the token
-- auto-creates a CareRelationship with the inviting professional.

CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

CREATE TABLE "Invitation" (
  "id"                UUID              NOT NULL DEFAULT gen_random_uuid(),
  "token"             TEXT              NOT NULL,
  "professionalId"    UUID              NOT NULL,
  "professionalRole"  "ProfessionalRole" NOT NULL,
  "email"             TEXT,
  "firstName"         TEXT,
  "lastName"          TEXT,
  "note"              TEXT,
  "status"            "InvitationStatus" NOT NULL DEFAULT 'PENDING',
  "expiresAt"         TIMESTAMP(3)      NOT NULL,
  "createdAt"         TIMESTAMP(3)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "usedAt"            TIMESTAMP(3),
  "usedByUserId"      UUID,
  CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");
CREATE INDEX "Invitation_token_idx" ON "Invitation"("token");
CREATE INDEX "Invitation_professionalId_idx" ON "Invitation"("professionalId");
CREATE INDEX "Invitation_status_idx" ON "Invitation"("status");
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_professionalId_fkey"
  FOREIGN KEY ("professionalId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_usedByUserId_fkey"
  FOREIGN KEY ("usedByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
