-- Public-facing professional profile fields visible to linked patients.
-- Both nullable: the professional can leave either or both empty until
-- they fill the profile. `specialties` is a comma-separated string
-- rendered as tags client-side (no normalization table needed for v1).

ALTER TABLE "User"
  ADD COLUMN "bio"         TEXT,
  ADD COLUMN "specialties" TEXT;
