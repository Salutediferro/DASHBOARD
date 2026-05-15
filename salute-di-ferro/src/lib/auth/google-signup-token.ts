import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Short-lived signed cookie that carries the consent + invite payload
 * across the Google OAuth round trip.
 *
 * Why a cookie at all: Supabase's signInWithOAuth bounces the user out
 * to Google, then back to /auth/callback. Without a cookie we'd have
 * to either trust URL params for "the user accepted GDPR consent"
 * (forgeable) or stash state in the DB and key it by something we know
 * pre-OAuth (we don't know the auth.users.id yet).
 *
 * The HMAC is keyed off SUPABASE_SERVICE_ROLE_KEY — already a required
 * secret in every deploy, so rotating it instantly invalidates every
 * outstanding token without adding a new env var.
 *
 * Payload shape (JSON, base64url-encoded then HMAC-signed):
 *   { c: true, i: "<inviteToken>" | null, e: <epoch-ms expiry> }
 */

export const GOOGLE_SIGNUP_COOKIE = "sdf-google-signup";
export const GOOGLE_SIGNUP_TTL_SECONDS = 15 * 60;

type Payload = {
  c: true;
  i: string | null;
  e: number;
};

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY missing");
  }
  return secret;
}

function sign(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function issueGoogleSignupToken(args: {
  inviteToken: string | null;
}): string {
  const payload: Payload = {
    c: true,
    i: args.inviteToken,
    e: Date.now() + GOOGLE_SIGNUP_TTL_SECONDS * 1000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyGoogleSignupToken(
  token: string | undefined | null,
): { ok: true; inviteToken: string | null } | { ok: false } {
  if (!token) return { ok: false };
  const dot = token.indexOf(".");
  if (dot <= 0) return { ok: false };
  const encoded = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  let expected: string;
  try {
    expected = sign(encoded);
  } catch {
    return { ok: false };
  }
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return { ok: false };
  if (!timingSafeEqual(a, b)) return { ok: false };

  let payload: Payload;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
  } catch {
    return { ok: false };
  }
  if (payload.c !== true) return { ok: false };
  if (typeof payload.e !== "number" || payload.e < Date.now()) {
    return { ok: false };
  }
  if (payload.i != null && typeof payload.i !== "string") return { ok: false };

  return { ok: true, inviteToken: payload.i };
}
