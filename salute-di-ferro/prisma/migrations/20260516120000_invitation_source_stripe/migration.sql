-- Extend Invitation with a `source` discriminator so Stripe-paid signups
-- can mint invites alongside professional-onboarded patients. The two
-- shapes differ:
--
--   PROFESSIONAL (existing): professionalId + professionalRole NOT NULL,
--                            auto-creates CareRelationship on accept.
--   STRIPE      (new):       professionalId / professionalRole NULL,
--                            patient picks pro post-signup.
--                            stripeCheckoutSessionId is the idempotency
--                            key against Stripe webhook retries.
--
-- Idempotent (IF NOT EXISTS / IF EXISTS) to mirror sibling migrations
-- and stay safe to re-run on already-migrated databases.

-- 1. New enum for the discriminator.
DO $$ BEGIN
  CREATE TYPE "InvitationSource" AS ENUM ('PROFESSIONAL', 'STRIPE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Columns on Invitation. All new columns default sensibly so the
--    backfill against existing rows is implicit:
--      - source defaults to PROFESSIONAL (every existing invite is)
--      - stripeCheckoutSessionId / stripeCustomerId are nullable
ALTER TABLE "Invitation"
  ADD COLUMN IF NOT EXISTS "source" "InvitationSource" NOT NULL DEFAULT 'PROFESSIONAL',
  ADD COLUMN IF NOT EXISTS "stripeCheckoutSessionId" TEXT,
  ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;

-- 3. Relax the NOT NULLs on professionalId / professionalRole so STRIPE
--    invites can omit them. Existing rows keep their values.
ALTER TABLE "Invitation"
  ALTER COLUMN "professionalId" DROP NOT NULL;
ALTER TABLE "Invitation"
  ALTER COLUMN "professionalRole" DROP NOT NULL;

-- 4. Idempotency key for the Stripe webhook — unique so duplicate event
--    deliveries can't double-create invitations.
CREATE UNIQUE INDEX IF NOT EXISTS "Invitation_stripeCheckoutSessionId_key"
  ON "Invitation" ("stripeCheckoutSessionId");

-- 5. Filter helper for the admin "Stripe invites" view.
CREATE INDEX IF NOT EXISTS "Invitation_source_idx"
  ON "Invitation" ("source");

-- 6. Cross-row integrity: a PROFESSIONAL invite must carry both
--    professionalId and professionalRole; a STRIPE invite must omit
--    professionalRole (id is implicitly null then). Belt + suspenders
--    on top of the app-level validation.
DO $$ BEGIN
  ALTER TABLE "Invitation"
    ADD CONSTRAINT "Invitation_source_professional_consistent"
    CHECK (
      (source = 'PROFESSIONAL' AND "professionalId" IS NOT NULL AND "professionalRole" IS NOT NULL)
      OR
      (source = 'STRIPE' AND "professionalId" IS NULL AND "professionalRole" IS NULL)
    );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
