import { createHmac, timingSafeEqual } from "node:crypto";

// Stateless gate cookie for the hidden /staff-provision page.
// The cookie value is an HMAC of a constant string under the shared
// password, so:
//   - it can't be forged without knowing STAFF_PROVISION_PASSWORD
//   - rotating the password instantly invalidates every issued cookie
//   - we keep zero server-side session state

export const STAFF_GATE_COOKIE = "staff_provision_gate";
export const STAFF_GATE_TTL_SECONDS = 30 * 60;

const HMAC_PAYLOAD = "staff-provision-gate-v1";

function getSecret(): string {
  const secret = process.env.STAFF_PROVISION_PASSWORD;
  if (!secret || secret.length < 8) {
    throw new Error(
      "STAFF_PROVISION_PASSWORD env var missing or shorter than 8 chars",
    );
  }
  return secret;
}

export function checkPassword(candidate: string): boolean {
  const secret = getSecret();
  const a = Buffer.from(candidate);
  const b = Buffer.from(secret);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function issueGateToken(): string {
  return createHmac("sha256", getSecret()).update(HMAC_PAYLOAD).digest("hex");
}

export function verifyGateToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const expected = issueGateToken();
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
