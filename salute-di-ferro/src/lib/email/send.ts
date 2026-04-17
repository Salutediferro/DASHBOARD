import { Resend } from "resend";

/**
 * Transactional email sender.
 *
 * Provider: Resend. We prefer Resend over self-hosted SMTP for
 * deliverability (SPF/DKIM/DMARC pre-configured on their sender
 * domains) and for the simple fetch-based API that works fine inside
 * Vercel edge runtimes.
 *
 * Wiring:
 *   RESEND_API_KEY          — server-only, required for sending
 *   EMAIL_FROM              — "Salute di Ferro <no-reply@salutediferro.com>"
 *                             (must be a verified domain in Resend)
 *
 * When RESEND_API_KEY is unset, sendEmail becomes a no-op that logs
 * what would have been sent — lets local dev run without the key.
 */

let client: Resend | null | undefined;

function getClient(): Resend | null {
  if (client !== undefined) return client;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    client = null;
    return null;
  }
  client = new Resend(key);
  return client;
}

export type SendEmailArgs = {
  to: string | string[];
  subject: string;
  /** Full HTML body (escape inputs before interpolation). */
  html: string;
  /** Plain-text fallback. Recommended by RFC 5322 + improves inbox
   *  placement. If omitted, Resend strips tags from html. */
  text?: string;
  /** Reply-To override; defaults to EMAIL_FROM. */
  replyTo?: string;
  /** Optional tags for Resend analytics. */
  tags?: Array<{ name: string; value: string }>;
};

export type SendEmailResult =
  | { ok: true; id: string; skipped?: false }
  | { ok: true; skipped: true; reason: "no-api-key" }
  | { ok: false; error: string };

export async function sendEmail(args: SendEmailArgs): Promise<SendEmailResult> {
  const c = getClient();
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return { ok: false, error: "EMAIL_FROM not configured" };
  }
  if (!c) {
    // Dev fallback: log the would-be email instead of failing so local
    // flows aren't blocked. Never do this in prod — the no-op warning
    // is in sendWithLogging() which wraps this for higher-level code.
    console.warn(
      `[email] RESEND_API_KEY missing. Would have sent to ${
        Array.isArray(args.to) ? args.to.join(", ") : args.to
      }: "${args.subject}"`,
    );
    return { ok: true, skipped: true, reason: "no-api-key" };
  }
  try {
    const { data, error } = await c.emails.send({
      from,
      to: args.to,
      subject: args.subject,
      html: args.html,
      text: args.text,
      replyTo: args.replyTo,
      tags: args.tags,
    });
    if (error || !data?.id) {
      return { ok: false, error: error?.message ?? "no id in Resend response" };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "unknown error",
    };
  }
}
