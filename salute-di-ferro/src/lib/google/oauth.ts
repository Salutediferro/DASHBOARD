import { google } from "googleapis";
import type { OAuth2Client } from "google-auth-library";

import { prisma } from "@/lib/prisma";

/**
 * Google OAuth glue.
 *
 * We use Google's "offline" flow with `prompt: consent` so the very
 * first round trip always returns a refresh_token — Google only mints
 * one the first time a user consents, so without `prompt: consent` a
 * re-link after `revoke` would silently leave us without offline
 * access.
 *
 * The minimum scopes we need:
 *   - calendar.events  → events.insert / patch / delete + Meet creation
 *   - userinfo.email   → so the UI can render "Connesso come <email>"
 *
 * `openid` is included because Google strongly recommends it whenever
 * you ask for `userinfo.email`; otherwise the consent screen warns the
 * user that the app is asking for "less secure" access.
 */
export const GOOGLE_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/calendar.events",
] as const;

function clientCredentials(): {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Google OAuth env vars missing — set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_OAUTH_REDIRECT_URI",
    );
  }
  return { clientId, clientSecret, redirectUri };
}

/** Whether the Google OAuth env vars are configured. UI uses this to
 *  hide the "Connetti" button in dev environments where the operator
 *  hasn't filled the .env in yet — better than letting the user click
 *  and crash on `clientCredentials()` above. */
export function googleOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      process.env.GOOGLE_OAUTH_REDIRECT_URI,
  );
}

/** Build a one-shot OAuth client for the auth-code exchange path. No
 *  user tokens loaded — that's `getOAuthClientForUser`. */
export function makeOAuthClient(): OAuth2Client {
  const { clientId, clientSecret, redirectUri } = clientCredentials();
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** URL the "Connetti Google Calendar" button sends the user to. The
 *  `state` value is round-tripped back to the callback and lives in a
 *  short-lived signed cookie — see /api/google/oauth/start. */
export function buildAuthUrl(state: string): string {
  const client = makeOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_SCOPES],
    state,
    include_granted_scopes: true,
  });
}

/** Exchange an authorization `code` for tokens and pull the linked
 *  Google account's email + stable subject id from the ID token. */
export async function exchangeCode(code: string): Promise<{
  refreshToken: string;
  accessToken: string;
  expiryDate: Date | null;
  scope: string;
  googleSub: string;
  email: string;
}> {
  const client = makeOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.refresh_token) {
    // Happens when the user has already consented in the past and we
    // didn't pass `prompt: consent` (or they re-used a stale code).
    // Tell the caller to re-run the flow; nothing to persist yet.
    throw new Error(
      "Google did not return a refresh token. Riprova la connessione.",
    );
  }
  if (!tokens.id_token) {
    throw new Error("Google did not return an id_token.");
  }
  if (!tokens.access_token) {
    throw new Error("Google did not return an access_token.");
  }

  const ticket = await client.verifyIdToken({
    idToken: tokens.id_token,
    audience: clientCredentials().clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Google id_token payload is missing sub or email.");
  }

  return {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    scope: tokens.scope ?? GOOGLE_SCOPES.join(" "),
    googleSub: payload.sub,
    email: payload.email,
  };
}

/**
 * Build an OAuth2Client for a specific User, hydrated with their stored
 * refresh + (cached) access token. Returns null when the user hasn't
 * linked Google yet.
 *
 * Side effect: when the googleapis library refreshes the access token
 * during a request, we persist the new value back to the database so
 * the next request doesn't have to refresh again. This is the standard
 * pattern from the googleapis README.
 */
export async function getOAuthClientForUser(
  userId: string,
): Promise<{ client: OAuth2Client; email: string } | null> {
  const row = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!row) return null;

  const client = makeOAuthClient();
  client.setCredentials({
    refresh_token: row.refreshToken,
    access_token: row.accessToken ?? undefined,
    expiry_date: row.expiryDate?.getTime() ?? undefined,
    scope: row.scope,
  });

  client.on("tokens", (tokens) => {
    // Fire-and-forget; if it fails we'll just refresh again next time.
    const data: {
      accessToken?: string | null;
      expiryDate?: Date | null;
      refreshToken?: string;
    } = {};
    if (tokens.access_token) data.accessToken = tokens.access_token;
    if (tokens.expiry_date) data.expiryDate = new Date(tokens.expiry_date);
    // Google sometimes rotates the refresh token — persist that too.
    if (tokens.refresh_token) data.refreshToken = tokens.refresh_token;
    if (Object.keys(data).length === 0) return;
    void prisma.googleAccount
      .update({ where: { userId }, data })
      .catch(() => {
        /* swallow — non-fatal */
      });
  });

  return { client, email: row.email };
}

/** Best-effort revoke at Google + delete the local row. Called from
 *  the "Disconnetti" button and from the GDPR delete flow. */
export async function disconnectGoogle(userId: string): Promise<void> {
  const row = await prisma.googleAccount.findUnique({ where: { userId } });
  if (!row) return;
  try {
    const client = makeOAuthClient();
    client.setCredentials({ refresh_token: row.refreshToken });
    await client.revokeCredentials();
  } catch {
    // If Google rejects the revoke (already revoked, network blip,
    // whatever) we still want the local row gone — otherwise the user
    // is stuck in a "Connesso" state they can't escape.
  }
  await prisma.googleAccount.delete({ where: { userId } });
}
