# Google Calendar + Meet + Google Sign-in — setup

Two separate Google integrations live in this repo:

| Concern         | Where                                | Scope                    |
| --------------- | ------------------------------------ | ------------------------ |
| Calendar + Meet | `src/lib/google/` + `/api/google/*`  | `calendar.events`        |
| Sign-in         | Supabase Auth (provider: google)     | `openid email profile`   |

**Why two flows?** Calendar minting needs a long-lived refresh token
stored server-side so a cron / API route can mint Meet links without
the user being in front of the browser. Supabase's OAuth gives you a
session-bound provider token only — fine for sign-in identity, not
fine for offline Calendar writes. Both flows can share the same OAuth
client in Google Cloud Console (just configure two redirect URIs).

## Calendar + Meet — what it does

When a professional accepts an appointment request, the dashboard:

- creates an event on their primary Google Calendar,
- mints a real `meet.google.com` link via Google Meet,
- emails the patient with that link.

The same `googleEventId` is reused to patch the event on reschedule and
delete it on cancellation.

## Sign-in — what it does

The "Continua con Google" button on `/login` and `/register` lets a
visitor authenticate with their Google account. On `/register` the two
GDPR consent checkboxes (privacy/terms + Art. 9 health-data processing)
gate the button — clicking it calls `POST /api/auth/google-signup/prepare`
to mint a short-lived signed cookie that carries the consent payload
across the OAuth round trip, then `/auth/callback` reads it back to
create the `public.User` row with the consent stamped in the audit log.

Existing accounts with the same email as the Google identity are
detected at callback time and bounced to `/login` with a clear error
— no silent account hijack from a stolen Google session.

## 1. Google Cloud Console

1. Create (or reuse) a Cloud project under the `salutediferro.com`
   organization. Name suggestion: `salute-di-ferro-prod`.
2. Enable the **Google Calendar API** under "APIs & Services → Library".
3. Configure the **OAuth consent screen** as External, Production-ready:
   - App name: `Salute di Ferro`
   - Support email: `info@salutediferro.com`
   - App logo, homepage, privacy policy, terms (use the existing legal
     pages under `/privacy`, `/terms`).
   - Authorized domain: `salutediferro.com`
   - Scopes: add `openid`, `userinfo.email`, and
     `https://www.googleapis.com/auth/calendar.events`.
4. Submit for verification once you're past test users.
   `calendar.events` is a sensitive scope — Google requires verification
   before more than ~100 outside users can grant consent.
5. Create OAuth 2.0 credentials → **Web application**:
   - Authorized redirect URIs (one per environment, for **both** the
     Calendar flow and Supabase's sign-in flow):
     - Calendar flow:
       - `https://my.salutediferro.com/api/google/oauth/callback`
       - `https://<staging-url>/api/google/oauth/callback`
       - `http://localhost:3000/api/google/oauth/callback`
     - Supabase sign-in: `https://<project-ref>.supabase.co/auth/v1/callback`
       (one per Supabase project — staging and prod).

## 2. Env vars (per environment)

Set in Vercel under Project → Settings → Environment Variables:

| Var                          | Notes                                              |
| ---------------------------- | -------------------------------------------------- |
| `GOOGLE_CLIENT_ID`           | from the OAuth client                              |
| `GOOGLE_CLIENT_SECRET`       | from the OAuth client                              |
| `GOOGLE_OAUTH_REDIRECT_URI`  | must match exactly one of the URIs configured above |

For local dev, mirror these into `.env.local`:

```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_OAUTH_REDIRECT_URI=http://localhost:3000/api/google/oauth/callback
```

When any of these is missing the "Collega Google Calendar" card on the
profile page shows a "non configurato" message and the connect button is
hidden — so the rest of the app keeps working in environments without
the integration.

## 2b. Supabase — enable Google provider (sign-in)

The "Continua con Google" button on `/login` and `/register` uses
Supabase's hosted OAuth flow. To turn it on:

1. Supabase Dashboard → Authentication → Providers → Google → toggle on.
2. Paste in the **same** OAuth client's Client ID + Secret from §1.
3. Save. Supabase exposes the callback URL right above the form
   (`https://<project-ref>.supabase.co/auth/v1/callback`) — make sure
   that URL is in the Google OAuth client's authorized redirect URIs
   (§1.5).
4. Repeat for the staging Supabase project — it has its own
   `<project-ref>` and therefore its own callback URL.

No extra env vars in Vercel for sign-in — Supabase stores the
client/secret on its side and exposes the flow via `supabase.auth.signInWithOAuth`.

The signup-consent HMAC cookie is signed with `SUPABASE_SERVICE_ROLE_KEY`
(already required elsewhere) — rotating that key invalidates every
outstanding signup token instantly.

## 3. Database

The migration `20260515120000_google_account_and_event_id` adds:

- `GoogleAccount` — one row per User, holds the refresh token used by
  the server to mint Meet links. Token is stored plain (same as
  `User.calendarFeedToken`); rely on Postgres + Supabase RLS to keep
  the row server-side.
- `Appointment.googleEventId` — id of the mirrored Calendar event so
  reschedules (`PATCH /api/appointments/:id`) and cancels (`DELETE …`)
  can patch/delete the same event.

The migration is idempotent (`IF NOT EXISTS`) so re-running it against a
DB that already has the columns is a no-op.

## 4. Verification status

Until Google verifies the consent screen, only the test users you list
under "OAuth consent screen → Test users" can complete the flow. Real
professionals trying to connect will see Google's "unverified app"
warning. Plan for submission **before** opening this to live pros.

## 5. Failure modes

- **Pro hasn't linked Google** → acceptance still succeeds, patient
  email goes out without a Meet link, pro gets a nudge email pointing
  to `/api/google/oauth/start`.
- **Pro linked but token revoked at Google** → Calendar API throws,
  acceptance still succeeds (logged in Sentry), patient email goes out
  without a Meet link. The next OAuth round trip re-installs the token.
- **Event manually deleted in Google Calendar** → reschedule/cancel
  sync silently no-ops (404 from `events.patch`/`delete` is swallowed).
