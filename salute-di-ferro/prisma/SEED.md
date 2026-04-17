# Seed — test accounts

> ⚠️ **Dev / staging only.** The seed script refuses to run against a
> Supabase pooler/host unless `SEED_ALLOW_PRODUCTION=1` is set. The
> passwords below are known defaults — never use them on production.
> On the production DB, test-account passwords have been rotated to
> unknown random values; the Prisma rows remain only for reference
> and internal demos.

`npx prisma db seed` resets the test users in both Supabase Auth and the
Prisma database. The seed is idempotent: running it twice yields the same
result.

**Common password for every test account (dev / staging only): `Password123!`**

Every account has `email_confirm=true`, so no confirmation email step is
required — you can log in straight from `/login`.

The seed auth-user id is mirrored as the Prisma `User.id` so that
`/api/me`, RLS, and role dispatch all work without any id translation.

## Accounts

| Email                            | Role    | Password       |
| -------------------------------- | ------- | -------------- |
| `admin@salutediferro.test`       | ADMIN   | `Password123!` |
| `dott.rossi@salutediferro.test`  | DOCTOR  | `Password123!` |
| `dott.bianchi@salutediferro.test`| DOCTOR  | `Password123!` |
| `coach.ferri@salutediferro.test` | COACH   | `Password123!` |
| `coach.greco@salutediferro.test` | COACH   | `Password123!` |
| `paziente1@test.local`           | PATIENT | `Password123!` |
| `paziente2@test.local`           | PATIENT | `Password123!` |
| `paziente3@test.local`           | PATIENT | `Password123!` |
| `paziente4@test.local`           | PATIENT | `Password123!` |
| `paziente5@test.local`           | PATIENT | `Password123!` |

## How it works

1. **Auth cleanup** — list every Supabase auth user whose email ends with
   `@salutediferro.test` or `@test.local` and delete them via
   `supabase.auth.admin.deleteUser`. Paginated list (1000 per page).
2. **Prisma cleanup** — `deleteMany` on `User` for the same email
   patterns. `CareRelationship`, `BiometricLog`, `MedicalReport`,
   `Appointment`, `AvailabilitySlot` all cascade on FK delete.
3. **Organization** — upsert "Salute di Ferro Clinic" by slug.
4. **User provisioning** — for each spec:
   1. `supabase.auth.admin.createUser({ email, password, email_confirm:
      true, app_metadata: { role }, user_metadata: { firstName,
      lastName } })`
   2. Use the returned `authUser.id` as `User.id` in Prisma
   3. If auth creation hits "already registered", find the stray auth
      record, delete it, retry once. On second failure, log and continue
      (does not crash the seed).
5. **Clinical data** — CareRelationships (each patient ↔ 1 doctor +
   1 coach), 3 BiometricLogs per patient (with computed BMI), 2
   MedicalReports per patient (`BLOOD_TEST` + `GENERAL_VISIT`,
   placeholder `fileUrl`), 4 Appointments per patient (2 future
   `SCHEDULED` + 2 past `COMPLETED`), 10 AvailabilitySlots per
   professional (Mon–Fri × 2 blocks).

## Requirements

The seed needs write access to Supabase Auth. It reads the following
from `.env.local`:

- `DIRECT_URL` (or `DATABASE_URL`) — Postgres connection
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

If `SUPABASE_SERVICE_ROLE_KEY` is missing the seed aborts with a clear
error message.

## Run

```bash
npx prisma db seed
```

## Reset the whole DB from scratch

```bash
# Destroys every row in the public schema. AI agents must pass
# PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION with the user's explicit
# consent text; humans get the usual interactive confirmation.
npx prisma migrate reset --force
```

`migrate reset` replays migrations and then invokes the seed, so
re-running it from zero is a single command.

## Supabase Storage buckets

The app expects two buckets to exist in the linked Supabase project.

### `avatars` (public)

- Visibility: public
- Allowed mime types: `image/png, image/jpeg, image/webp, image/heic`
- Max file size: 3 MB
- **Auto-created** on first upload by `POST /api/me/avatar`. No manual
  setup needed.

### `medical-reports` (private) — GDPR Art. 9

- Visibility: **private** (objects are only accessible via signed URLs)
- Allowed mime types: `application/pdf, image/png, image/jpeg,
  image/webp, image/heic`
- Max file size: 20 MB
- Path convention: `{patientId}/{uuid}.{ext}`
- **Manual setup required** — the API does NOT auto-create this bucket
  (auto-create would default to public, which is unsafe for clinical
  files). Create it once per environment via:

  **Supabase Dashboard**: Storage → New bucket → name `medical-reports`,
  toggle "Public bucket" **OFF**, set file size limit to 20 MB, allowed
  mime types as above.

  **Or via the JS admin client** in a one-off script:

  ```ts
  import { createClient } from "@supabase/supabase-js";
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  await admin.storage.createBucket("medical-reports", {
    public: false,
    fileSizeLimit: 20 * 1024 * 1024,
    allowedMimeTypes: [
      "application/pdf",
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/heic",
    ],
  });
  ```

All read access goes through `GET /api/medical-reports/[id]` which
returns a fresh 15-minute signed URL after enforcing the double access
check (owner patient, OR ADMIN, OR DOCTOR/COACH with both an ACTIVE
`CareRelationship` AND an unrevoked `ReportPermission` for that
specific report).
