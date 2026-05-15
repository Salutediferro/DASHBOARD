# Google identity linking — setup

Lets a logged-in user (one who originally signed up with email +
password) attach a Google identity to their existing account. After
linking, they can sign in with either method.

The button lives on the [Sicurezza](../src/app/dashboard/settings/security/page.tsx)
settings page, alongside 2FA management. Implementation:
[GoogleIdentityCard](../src/components/security/google-identity-card.tsx).

## What you need to do once

### 1. Enable Manual Linking in Supabase

Supabase Dashboard → **Authentication → Settings → User Signups** →
toggle **"Allow manual linking"** on.

Without this, `supabase.auth.linkIdentity({ provider: "google" })`
errors with `manual_linking_disabled` and the toast surfaces that
message verbatim.

Repeat for the staging Supabase project.

### 2. Make sure the Google provider is already configured

Same prerequisite as the sign-in flow:
- Google provider enabled in Supabase Auth → Providers.
- `https://<project-ref>.supabase.co/auth/v1/callback` listed in the
  Google Cloud OAuth client's authorized redirect URIs.

### 3. Allow the security-page URL as a redirect target

Supabase Dashboard → **Authentication → URL Configuration → Redirect URLs**:
add the security page so Supabase will redirect back there after the
linking OAuth round trip succeeds.

```
http://localhost:3000/dashboard/settings/security
https://<staging-url>/dashboard/settings/security
https://my.salutediferro.com/dashboard/settings/security
```

Supabase rejects redirects to URLs not in this list.

## Behaviour

| Account state                              | Card shows                            |
| ------------------------------------------ | ------------------------------------- |
| No Google identity linked                  | "Collega Google" button               |
| Google linked, password identity also set  | "Connesso come …" + "Scollega"        |
| Google is the **only** identity            | "Scollega" refuses with a toast that tells the user to set a password first via "Password dimenticata?" — prevents account lockout |

Identities live on `auth.users` only. There's no Prisma migration and
no extra Postgres state.
