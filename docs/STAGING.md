# Staging environment setup

> Goal: a separate deploy that mirrors production, with its own database,
> so schema changes and risky refactors can be validated before they
> touch real patient data.

Vercel already ships preview deployments for every git branch. The only
moving parts are:

1. A second Supabase project (database + auth + storage).
2. A `staging` git branch kept roughly in sync with `main`.
3. Vercel env vars scoped to the **Preview** environment pointing at the
   new Supabase project.
4. A banner at the top of the app marking the deploy as non-production
   (already wired via `<EnvironmentBanner />`).

## 1. Create the staging Supabase project

- Supabase dashboard → New project.
- Name: `Salute di Ferro — staging`.
- Region: `eu-west-1` or `eu-north-1` (same region family as prod is
  fine; co-locate with your dev box).
- Password: strong, stored in your password manager.
- Once healthy, copy:
  - Project Ref (alphanumeric, under the project URL).
  - `DATABASE_URL` — use the **transaction pooler** (port 6543).
  - `DIRECT_URL`   — use the **session pooler** (port 5432).
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (keep this out of the client).

## 2. Apply the schema

From your local machine, with the staging URLs in `.env.staging.local`:

```bash
DIRECT_URL='postgresql://...'           npx prisma migrate deploy
SEED_ALLOW_PRODUCTION=0                 npx prisma db seed   # see note
```

The seed's production guard is scoped to the known prod project ref
(see `prisma/seed.ts`), so staging passes without needing the override.

Create the Supabase Storage buckets the app uses:

- `medical-reports` — private, 15MB cap.
- `avatars` — public, 2MB cap.

(The Supabase UI has a "Copy bucket settings from another project"
flow; or you can replicate manually.)

## 3. Create the `staging` branch

```bash
git checkout -b staging
git push -u origin staging
```

Vercel picks it up automatically and starts a preview deploy. The URL
pattern is
`https://salute-di-ferro-git-staging-salute-di-ferros-projects.vercel.app`.
Set up a custom alias later (`staging.salutediferro.com`) by pointing
a CNAME at Vercel the same way `my.salutediferro.com` was wired.

## 4. Configure Vercel env for Preview

Dashboard → Project → Settings → Environment Variables. For every row,
set the environment scope to **Preview** (NOT production):

| Var                           | Value (staging)                     |
| ----------------------------- | ------------------------------------ |
| `DATABASE_URL`                | staging transaction-pooler URL       |
| `DIRECT_URL`                  | staging session-pooler URL           |
| `NEXT_PUBLIC_SUPABASE_URL`    | staging API URL                      |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| staging anon key                    |
| `SUPABASE_SERVICE_ROLE_KEY`   | staging service-role key             |
| `RESEND_API_KEY`              | same as prod, or a test key          |
| `EMAIL_FROM`                  | `staging@salutediferro.com` (verified)|
| `CRON_SECRET`                 | any random string (can differ)       |
| `UPSTASH_REDIS_REST_URL`      | separate Upstash DB or prod — either |
| `UPSTASH_REDIS_REST_TOKEN`    | matching token                       |
| `NEXT_PUBLIC_SENTRY_DSN`      | same DSN, Sentry auto-tags by env    |
| `SENTRY_DSN`                  | same                                 |
| `NEXT_PUBLIC_PLAUSIBLE_DOMAIN`| `staging.salutediferro.com`          |

Save and redeploy the staging branch.

## 5. Day-to-day workflow

- Work on feature branches off `main`.
- When a branch is ready for review, open a PR to `main`. Vercel posts
  a preview URL on the PR that uses the **Preview** env vars.
- Merge to `main` → production deploy.
- Keep `staging` long-lived for multi-day QA; periodically rebase onto
  `main` (or cherry-pick) so it doesn't drift.

## 6. Promotion script (optional)

```bash
# Fast-forward staging to the current main
git checkout staging && git pull && git merge --ff-only main && git push
```

## 7. Resetting staging data

```bash
# Point at staging, keep prod untouched
DIRECT_URL='postgresql://.../staging' \
  npx prisma migrate reset --force
SEED_ALLOW_PRODUCTION=0 npx prisma db seed
```

## 8. Banner (already wired)

`<EnvironmentBanner />` in the root layout reads
`NEXT_PUBLIC_VERCEL_ENV`. Vercel injects that automatically on every
deploy: `"production"` on main, `"preview"` on branches. The banner
only renders in non-production.

## 9. What NOT to put on staging

- Real patient emails (staging SMTP may bounce, and real patients
  shouldn't receive test emails).
- Real payment keys (if/when Stripe is activated).
- Production secrets of any kind — keep the staging service-role key
  isolated to staging.
