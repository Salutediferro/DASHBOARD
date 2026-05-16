import { NextResponse } from "next/server";
import crypto from "node:crypto";
import type Stripe from "stripe";

import { getStripe, getWebhookSecret } from "@/lib/stripe/server";
import { prisma } from "@/lib/prisma";
import { getFeatureFlag } from "@/lib/feature-flags";
import { logAudit } from "@/lib/audit";
import { sendEmail } from "@/lib/email/send";
import { invitationEmail } from "@/lib/email/templates";

/**
 * POST /api/webhooks/stripe
 *
 * Receives Stripe events for the *purchase-driven invitation flow*. The
 * marketing site / pricing page hosts the Checkout itself; the only
 * thing this endpoint cares about is `checkout.session.completed`:
 * proof that a customer just paid for a seat. We mint a one-shot
 * Invitation row (source=STRIPE, professionalId=NULL) and email the
 * sign-up link to the customer.
 *
 * Hard requirements:
 *   1. **Raw body** for signature verification. App Router's `req.text()`
 *      hands us the raw bytes (Stripe SDK hashes them against the
 *      `Stripe-Signature` header). Calling `req.json()` here would
 *      break verification.
 *   2. **Idempotency** — Stripe retries failed deliveries, so we dedupe
 *      on `Invitation.stripeCheckoutSessionId` (unique). A repeat
 *      delivery for the same session is a no-op 200.
 *   3. **Fast 2xx** — Stripe will keep retrying for ~3 days on any
 *      non-2xx response. Best-effort the email send: if it fails, we
 *      still 200 (the invite row exists; admins can resend from the
 *      "Stripe invites" view).
 *
 * Env:
 *   STRIPE_SECRET_KEY      — server-only Stripe secret.
 *   STRIPE_WEBHOOK_SECRET  — `whsec_…` from the dashboard endpoint
 *                            pointing at this route's public URL.
 *
 * The `patient-registration-open` feature flag remains the master kill
 * switch: when OFF, the webhook still 200s (so Stripe doesn't retry
 * forever) but skips invitation creation, audits the skip, and lets
 * the payment sit until the flag is flipped back on. Refunds, if
 * needed, are an out-of-band ops decision.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = getWebhookSecret();

  if (!stripe || !secret) {
    // 503 not 200: a misconfigured prod is a real outage, not a
    // duplicate event. Stripe will retry until ops fix the env.
    console.error("[stripe/webhook] STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET missing");
    return NextResponse.json(
      { error: "Stripe not configured" },
      { status: 503 },
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  // CRITICAL: must be the raw text, not the parsed JSON. Stripe HMACs
  // the exact bytes; any whitespace difference would break verification.
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error(`[stripe/webhook] signature verification failed: ${message}`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Branch on event type. We currently only act on checkout completion;
  // other events are acknowledged so Stripe doesn't retry them. Future:
  // subscription lifecycle (created/updated/deleted) feeds the
  // Subscription Prisma model, but that's separate from invitation minting.
  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true }, { status: 200 });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const sessionId = session.id;

  // Idempotency: Stripe retries on any non-2xx, and a single user
  // refreshing the success page can fire dupes too. Unique index on
  // stripeCheckoutSessionId enforces it at the DB level — this lookup
  // just short-circuits before a known-loser INSERT.
  const existing = await prisma.invitation.findUnique({
    where: { stripeCheckoutSessionId: sessionId },
    select: { id: true, status: true },
  });
  if (existing) {
    return NextResponse.json(
      { received: true, dedup: existing.id },
      { status: 200 },
    );
  }

  // Email source priority:
  //   1. session.customer_details.email  (what the buyer typed in checkout)
  //   2. session.customer_email          (legacy field, sometimes set)
  //   3. expanded customer object's email
  // Without an email we cannot deliver the invite; bail to a 400 so
  // ops see the failure in Stripe's dashboard rather than silently
  // accumulating orphan paid customers.
  const email =
    session.customer_details?.email ??
    session.customer_email ??
    (typeof session.customer === "object" && session.customer !== null && "email" in session.customer
      ? (session.customer as Stripe.Customer).email
      : null);

  if (!email) {
    console.error(
      `[stripe/webhook] checkout.session.completed has no email — session=${sessionId}`,
    );
    return NextResponse.json(
      { error: "No email on checkout session" },
      { status: 400 },
    );
  }

  // Name fallback chain. The buyer may have skipped name fields in
  // Checkout, in which case we leave them null and let the patient
  // fill them in on the sign-up form.
  const buyerName = session.customer_details?.name?.trim() ?? null;
  const [firstName, ...rest] = buyerName ? buyerName.split(/\s+/) : [];
  const lastName = rest.length > 0 ? rest.join(" ") : null;

  // Stripe customer id, when present. We stamp it on the Invitation
  // (and later, on accept, onto User.stripeCustomerId) so the
  // Subscription model can be joined back to the right person.
  const stripeCustomerId =
    typeof session.customer === "string"
      ? session.customer
      : (session.customer?.id ?? null);

  // Kill-switch: when admin has flipped patient registration off, log
  // the skipped payment but still 2xx so Stripe stops retrying. The
  // payment was real (Stripe took the money) — refunds/manual handling
  // are an ops decision out of band.
  const registrationOpen = await getFeatureFlag("patient-registration-open");
  if (!registrationOpen) {
    console.warn(
      `[stripe/webhook] registration closed — skipping invite for session=${sessionId} email=${email}`,
    );
    try {
      await logAudit({
        actorId: null,
        action: "STRIPE_INVITE_SKIPPED",
        entityType: "Invitation",
        entityId: null,
        metadata: {
          reason: "registration-closed",
          stripeCheckoutSessionId: sessionId,
          stripeCustomerId,
          email,
        },
        request: req,
      });
    } catch {
      // Audit failures must not block the 200.
    }
    return NextResponse.json({ received: true, skipped: "flag-off" }, { status: 200 });
  }

  // Stripe invites expire after 30 days — longer than the 14-day
  // professional default because the buyer may not check email for
  // a while after the impulse purchase, and we don't want to force
  // them to ask for a resend.
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // 32 URL-safe bytes — same entropy as professional invitations
  // (src/app/api/invitations/route.ts:generateInviteToken).
  const token = crypto.randomBytes(32).toString("base64url");

  const invite = await prisma.invitation.create({
    data: {
      token,
      source: "STRIPE",
      // professionalId / professionalRole intentionally null — DB
      // check constraint enforces this.
      professionalId: null,
      professionalRole: null,
      email,
      firstName: firstName ?? null,
      lastName,
      status: "PENDING",
      expiresAt,
      stripeCheckoutSessionId: sessionId,
      stripeCustomerId,
    },
    select: {
      id: true,
      token: true,
      email: true,
      firstName: true,
      expiresAt: true,
    },
  });

  // Build the absolute sign-up URL. The webhook request itself comes
  // from Stripe (no useful Origin), so we read NEXT_PUBLIC_APP_URL —
  // it's also what email senders use for unsubscribe / link branding.
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://my.salutediferro.com";
  const inviteUrl = `${appUrl}/register?invite=${invite.token}`;

  // Best-effort email send. Failures are logged + audited but don't
  // 5xx the webhook — Stripe would just retry, and a second email is
  // worse than no email.
  const { html, text } = invitationEmail({
    inviteUrl,
    // No professional yet — template renders the "you bought a seat,
    // pick a pro after sign-up" variant.
    professionalName: null,
    professionalRole: null,
    expiresAt: invite.expiresAt,
    firstName: invite.firstName,
  });

  const result = await sendEmail({
    to: email,
    subject: "Benvenuto in Salute di Ferro — completa la registrazione",
    html,
    text,
    tags: [
      { name: "type", value: "invitation" },
      { name: "source", value: "stripe" },
    ],
  });

  if (!result.ok) {
    console.error(
      `[stripe/webhook] email send failed for invite ${invite.id}: ${result.error}`,
    );
  }

  try {
    await logAudit({
      actorId: null,
      action: "STRIPE_INVITE_CREATED",
      entityType: "Invitation",
      entityId: invite.id,
      metadata: {
        stripeCheckoutSessionId: sessionId,
        stripeCustomerId,
        email,
        emailSent: result.ok,
        expiresAt: invite.expiresAt.toISOString(),
      },
      request: req,
    });
  } catch {
    // Best-effort.
  }

  return NextResponse.json(
    {
      received: true,
      invitationId: invite.id,
      emailSent: result.ok,
    },
    { status: 200 },
  );
}
