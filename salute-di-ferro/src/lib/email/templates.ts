/**
 * Email templates — plain HTML, inline styles, no external CSS.
 *
 * Why plain HTML instead of React Email / MJML:
 *   - Zero extra build step; the same file compiles as part of the
 *     Next.js server runtime.
 *   - Renders identically across Gmail / Outlook / Apple Mail because
 *     we stay inside the email-safe subset (tables + inline styles).
 *   - Easy to A/B test or swap for a React Email library later.
 *
 * All templates expose both `html` and `text` variants — inbox providers
 * use the text/plain version as a signal against spam.
 */

// Design tokens — kept in sync with src/app/globals.css :root.
// Email clients can't read CSS variables, so values are hardcoded here.
const BG = "#0a0a0a";
const CARD = "#2f2f2f";
const BORDER = "#3a3a3a";
const TEXT = "#fafafa";
const MUTED = "#a1a1a1";
const PRIMARY = "#b22222"; // brand red
const PRIMARY_DARK = "#7a1717";
const ACCENT = "#c0c0c0"; // chrome silver
const FONT_STACK =
  '"Avenir Next","Avenir","Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// `SdF` mark — chrome gradient square with the lowercase `d` in brand red.
// Mirrors src/components/brand/logo.tsx (variant="mark").
// Outlook strips linear-gradient; the solid `background-color` fallback is
// the mid-stop of the gradient so the mark still reads as silver.
function brandMark() {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
      <tr><td align="center" valign="middle"
        width="44" height="44"
        style="width:44px;height:44px;background-color:${ACCENT};background-image:linear-gradient(135deg,#e8e8e8 0%,#c0c0c0 40%,#8a8a8a 100%);border-radius:8px;font-family:${FONT_STACK};font-weight:800;font-size:18px;line-height:1;color:#0a0a0a;letter-spacing:-0.01em;">
        S<span style="color:${PRIMARY};">d</span>F
      </td></tr>
    </table>`;
}

// Full wordmark — SALUTE (silver) DI FERRO (red), uppercase, wide tracking.
function brandWordmark() {
  return `<div style="font-family:${FONT_STACK};font-weight:800;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;line-height:1;">
    <span style="color:${ACCENT};">SALUTE</span>&nbsp;<span style="color:${PRIMARY};">DI FERRO</span>
  </div>`;
}

function layout(inner: string) {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Salute di Ferro</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:${FONT_STACK};line-height:1.55;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border:1px solid ${BORDER};border-radius:10px;box-shadow:0 12px 28px -6px rgba(0,0,0,0.6),0 4px 10px -4px rgba(0,0,0,0.45);">
          <tr><td style="padding:28px 32px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td valign="middle" style="width:44px;padding-right:12px;">${brandMark()}</td>
                <td valign="middle">${brandWordmark()}</td>
              </tr>
            </table>
          </td></tr>
          <tr><td style="padding:0 32px;">
            <div style="height:1px;background:${BORDER};margin:20px 0 4px;"></div>
          </td></tr>
          <tr><td style="padding:16px 32px 8px;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              ${inner}
            </table>
          </td></tr>
          <tr><td style="padding:24px 32px 28px;">
            <div style="border-top:1px solid ${BORDER};padding-top:20px;color:${MUTED};font-size:11px;line-height:1.55;text-align:center;">
              Stai ricevendo questa email perché sei registrato su Salute di Ferro.<br/>
              Per domande rispondi a <a href="mailto:info@salutediferro.com" style="color:${ACCENT};text-decoration:none;">info@salutediferro.com</a>.
            </div>
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Brand-red gradient CTA. The solid `background-color` is the fallback for
// Outlook (which strips background-image); the gradient renders on every
// other client (Gmail, Apple Mail, iOS, Android).
function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background-color:${PRIMARY};background-image:linear-gradient(135deg,${PRIMARY} 0%,${PRIMARY_DARK} 100%);color:${TEXT};padding:13px 26px;border-radius:8px;text-decoration:none;font-family:${FONT_STACK};font-weight:600;font-size:14px;letter-spacing:0.01em;box-shadow:0 1px 0 rgba(192,192,192,0.10),0 4px 10px -2px rgba(0,0,0,0.5);">${label}</a>`;
}

// ── Invitation ────────────────────────────────────────────────────────

export function invitationEmail(params: {
  inviteUrl: string;
  professionalName: string;
  professionalRole: "DOCTOR" | "COACH";
  expiresAt: Date;
  firstName?: string | null;
}): { html: string; text: string } {
  const greeting = params.firstName
    ? `Ciao ${escapeHtml(params.firstName)},`
    : "Ciao,";
  const roleLabel =
    params.professionalRole === "DOCTOR" ? "il professionista" : "il coach";
  const proName = escapeHtml(params.professionalName);
  const expiry = params.expiresAt.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const html = layout(`
    <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px;">${greeting}</td></tr>
    <tr><td style="color:${MUTED};padding-bottom:20px;">
      ${proName} ti ha invitato a entrare su <strong style="color:${TEXT};">Salute di Ferro</strong>
      come suo cliente. Clicca il bottone qui sotto per completare la registrazione;
      al termine sarai collegato automaticamente a ${roleLabel}.
    </td></tr>
    <tr><td align="center" style="padding:8px 0 24px;">
      ${button(params.inviteUrl, "Completa la registrazione")}
    </td></tr>
    <tr><td style="color:${MUTED};font-size:13px;padding-bottom:16px;">
      Il link scade il ${expiry} ed è a uso singolo. Se non riconosci l'invito puoi ignorare questa email.
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;word-break:break-all;">
      Se il bottone non funziona, copia e incolla questo link nel browser:<br/>
      <span style="color:${TEXT};">${escapeHtml(params.inviteUrl)}</span>
    </td></tr>
  `);

  const text = [
    greeting,
    "",
    `${params.professionalName} ti ha invitato su Salute di Ferro come suo cliente.`,
    "",
    "Completa la registrazione al link qui sotto:",
    params.inviteUrl,
    "",
    `Il link scade il ${expiry} ed è a uso singolo.`,
    "Se non riconosci l'invito, ignora questa email.",
    "",
    "— Salute di Ferro",
  ].join("\n");

  return { html, text };
}

// ── Welcome professional (admin-provisioned onboarding) ──────────────

export function welcomeProfessionalEmail(params: {
  /** Action link from supabase.auth.admin.generateLink (type: recovery).
   *  Clicking it establishes a session and redirects to set-password. */
  setupUrl: string;
  firstName: string;
  role: "DOCTOR" | "COACH";
}): { html: string; text: string; subject: string } {
  const roleLabel = params.role === "DOCTOR" ? "professionista" : "coach";
  const firstName = escapeHtml(params.firstName);
  const subject = `Benvenuto in Salute di Ferro — imposta la tua password`;

  const html = layout(`
    <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px;">Ciao ${firstName},</td></tr>
    <tr><td style="color:${MUTED};padding-bottom:20px;">
      Il tuo account <strong style="color:${TEXT};">${roleLabel}</strong> su
      <strong style="color:${TEXT};">Salute di Ferro</strong> è stato creato.
      Per attivarlo devi impostare una password personale — scegli qualcosa
      di robusto e che solo tu conosci.
    </td></tr>
    <tr><td align="center" style="padding:8px 0 24px;">
      ${button(params.setupUrl, "Imposta la password e accedi")}
    </td></tr>
    <tr><td style="color:${MUTED};font-size:13px;padding-bottom:16px;">
      Per motivi di sicurezza il link scade entro 24 ore. Se scade, scrivici
      a info@salutediferro.com e te ne invieremo uno nuovo.
    </td></tr>
    <tr><td style="color:${MUTED};font-size:13px;padding-bottom:16px;">
      <strong style="color:${TEXT};">Due consigli importanti</strong>:<br/>
      1. Attiva l'autenticazione a due fattori (2FA) dal tuo profilo appena
      sei dentro — obbligatoria per chi gestisce dati clinici.<br/>
      2. Se hai ricevuto questa email senza averla richiesta, ignorala e
      segnalaci il problema.
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;word-break:break-all;">
      Se il bottone non funziona, copia e incolla questo link nel browser:<br/>
      <span style="color:${TEXT};">${escapeHtml(params.setupUrl)}</span>
    </td></tr>
  `);

  const text = [
    `Ciao ${params.firstName},`,
    "",
    `Il tuo account ${roleLabel} su Salute di Ferro è stato creato.`,
    "Per attivarlo imposta una password personale al link qui sotto:",
    params.setupUrl,
    "",
    "Il link scade entro 24 ore.",
    "",
    "Consigli:",
    "- Attiva il 2FA dal profilo appena dentro.",
    "- Se non ti aspettavi questa email, ignorala.",
    "",
    "— Salute di Ferro",
  ].join("\n");

  return { html, text, subject };
}

// ── Admin-triggered password reset ────────────────────────────────────

export function passwordResetEmail(params: {
  /** Action link from supabase.auth.admin.generateLink (type: recovery). */
  resetUrl: string;
  firstName: string;
}): { html: string; text: string; subject: string } {
  const firstName = escapeHtml(params.firstName);
  const subject = `Reset della password — Salute di Ferro`;

  const html = layout(`
    <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px;">Ciao ${firstName},</td></tr>
    <tr><td style="color:${MUTED};padding-bottom:20px;">
      Un amministratore di <strong style="color:${TEXT};">Salute di Ferro</strong>
      ha avviato un reset della tua password. Clicca il bottone qui sotto per
      scegliere una nuova password e rientrare nel tuo account.
    </td></tr>
    <tr><td align="center" style="padding:8px 0 24px;">
      ${button(params.resetUrl, "Imposta una nuova password")}
    </td></tr>
    <tr><td style="color:${MUTED};font-size:13px;padding-bottom:16px;">
      Il link scade entro 24 ore. Se non hai richiesto tu il reset ma riconosci
      questa email, rispondi a info@salutediferro.com così verifichiamo.
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;word-break:break-all;">
      Se il bottone non funziona, copia e incolla questo link nel browser:<br/>
      <span style="color:${TEXT};">${escapeHtml(params.resetUrl)}</span>
    </td></tr>
  `);

  const text = [
    `Ciao ${params.firstName},`,
    "",
    "Un amministratore ha avviato un reset della tua password su Salute di Ferro.",
    "Imposta una nuova password al link qui sotto:",
    params.resetUrl,
    "",
    "Il link scade entro 24 ore.",
    "Se non hai richiesto tu il reset, scrivi a info@salutediferro.com.",
    "",
    "— Salute di Ferro",
  ].join("\n");

  return { html, text, subject };
}

// ── Appointment reminder ──────────────────────────────────────────────

export function appointmentReminderEmail(params: {
  recipientName: string;
  recipientRole: "PATIENT" | "DOCTOR" | "COACH";
  /** The other party's full name (patient for pros, pro for patient). */
  counterpartName: string;
  appointmentStart: Date;
  appointmentType: string;
  /** Hours until the appointment (24 or 1). */
  hoursUntil: number;
  meetingUrl: string | null;
  appUrl: string;
}): { html: string; text: string; subject: string } {
  const when = params.appointmentStart.toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const headline =
    params.hoursUntil <= 2
      ? `Appuntamento tra un'ora`
      : `Promemoria appuntamento`;

  const subject = `${headline} — ${params.appointmentType} con ${params.counterpartName}`;
  const ctaLabel = params.meetingUrl
    ? "Entra nella videochiamata"
    : "Vedi i dettagli";
  const ctaHref = params.meetingUrl ?? `${params.appUrl}/dashboard`;

  const html = layout(`
    <tr><td style="font-family:${FONT_STACK};font-size:22px;font-weight:700;letter-spacing:-0.01em;line-height:1.2;color:${TEXT};padding-bottom:10px;">${headline}</td></tr>
    <tr><td style="color:${MUTED};font-size:15px;padding-bottom:20px;">
      Ciao ${escapeHtml(params.recipientName)}, ricordati del tuo appuntamento con
      <strong style="color:${TEXT};font-weight:600;">${escapeHtml(params.counterpartName)}</strong>.
    </td></tr>
    <tr><td style="padding-bottom:20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border:1px solid ${BORDER};border-radius:10px;">
        <tr><td style="padding:18px 18px 14px;border-left:3px solid ${PRIMARY};border-top-left-radius:10px;border-bottom-left-radius:10px;">
          <div style="color:${ACCENT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Quando</div>
          <div style="font-size:16px;font-weight:600;color:${TEXT};padding-top:6px;">${escapeHtml(when)}</div>
        </td></tr>
        <tr><td style="padding:0 18px;">
          <div style="height:1px;background:${BORDER};"></div>
        </td></tr>
        <tr><td style="padding:14px 18px 18px;border-left:3px solid ${PRIMARY};border-bottom-left-radius:10px;">
          <div style="color:${ACCENT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Tipo</div>
          <div style="font-size:16px;color:${TEXT};padding-top:6px;">${escapeHtml(params.appointmentType)}</div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:4px 0 24px;">
      ${button(ctaHref, ctaLabel)}
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;line-height:1.55;">
      Se non puoi partecipare, annulla dal tuo calendario in app così l&apos;altra persona viene avvisata.
    </td></tr>
  `);

  const text = [
    `${headline}`,
    "",
    `Ciao ${params.recipientName},`,
    `ricordati del tuo appuntamento con ${params.counterpartName}.`,
    "",
    `Quando: ${when}`,
    `Tipo: ${params.appointmentType}`,
    "",
    params.meetingUrl
      ? `Videochiamata: ${params.meetingUrl}`
      : `Dettagli: ${params.appUrl}/dashboard`,
    "",
    "— Salute di Ferro",
  ].join("\n");

  return { html, text, subject };
}

// ── Therapy reminder (opaque) ─────────────────────────────────────────
//
// IMPORTANT: this template is intentionally opaque on supplement
// content. Email is not an authenticated channel and the patient's
// inbox provider can read every line we send, so we never name the
// supplement, the dose, or the underlying condition. The deep link
// carries the metadata that lets the authenticated dashboard show the
// right row when the user clicks through.

export function therapyReminderEmail(params: {
  recipientName: string;
  /** The HH:MM the user originally set, formatted for their locale. */
  timeLabel: string;
  /** Authenticated landing page that highlights the right supplement. */
  deepLinkUrl: string;
}): { html: string; text: string; subject: string } {
  const subject = "È ora del tuo supplemento";
  const greeting = params.recipientName
    ? `Ciao ${escapeHtml(params.recipientName)},`
    : "Ciao,";

  const html = layout(`
    <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px;">${subject}</td></tr>
    <tr><td style="color:${MUTED};padding-bottom:16px;">
      ${greeting} è il momento del tuo supplemento programmato per le
      <strong style="color:${TEXT};">${escapeHtml(params.timeLabel)}</strong>.
      Apri Salute di Ferro per vedere quale e segnare l&apos;assunzione.
    </td></tr>
    <tr><td align="center" style="padding:8px 0 24px;">
      ${button(params.deepLinkUrl, "Apri promemoria")}
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;">
      Per privacy non includiamo dettagli del supplemento in questa email.
      Se non vuoi più ricevere questi promemoria, disattivali nella scheda del
      supplemento all&apos;interno dell&apos;app.
    </td></tr>
  `);

  const text = [
    subject,
    "",
    `${greeting}`,
    `è il momento del tuo supplemento programmato per le ${params.timeLabel}.`,
    "Apri Salute di Ferro per vedere quale e segnare l'assunzione:",
    params.deepLinkUrl,
    "",
    "Per privacy non includiamo dettagli del supplemento in questa email.",
    "",
    "— Salute di Ferro",
  ].join("\n");

  return { html, text, subject };
}

// ── Appointment accepted (patient-facing) ─────────────────────────────
//
// Sent to the patient the moment the professional taps "Accetta" on a
// PENDING request. Mirrors the visual language of appointmentReminderEmail
// — same when/type/cta layout — so the inbox thread feels like one
// continuous conversation about the same appointment.

export function appointmentAcceptedEmail(params: {
  patientName: string;
  professionalName: string;
  appointmentStart: Date;
  appointmentType: string;
  meetingUrl: string | null;
  notes: string | null;
  appUrl: string;
}): { html: string; text: string; subject: string } {
  const when = params.appointmentStart.toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const subject = `Appuntamento confermato — ${params.appointmentType} con ${params.professionalName}`;

  const ctaLabel = params.meetingUrl
    ? "Entra nella videochiamata"
    : "Vedi i dettagli";
  const ctaHref = params.meetingUrl ?? `${params.appUrl}/dashboard`;

  const meetingRow = params.meetingUrl
    ? `<tr><td style="padding:0 18px;">
        <div style="height:1px;background:${BORDER};"></div>
      </td></tr>
      <tr><td style="padding:14px 18px 18px;border-left:3px solid ${PRIMARY};border-bottom-left-radius:10px;">
        <div style="color:${ACCENT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Videochiamata</div>
        <div style="font-size:14px;color:${TEXT};padding-top:6px;word-break:break-all;">
          <a href="${params.meetingUrl}" style="color:${TEXT};text-decoration:none;">${escapeHtml(params.meetingUrl)}</a>
        </div>
      </td></tr>`
    : "";

  const notesRow = params.notes
    ? `<tr><td style="color:${MUTED};font-size:14px;padding:0 0 20px;">
        <strong style="color:${TEXT};font-weight:600;">Note:</strong> ${escapeHtml(params.notes)}
      </td></tr>`
    : "";

  const html = layout(`
    <tr><td style="font-family:${FONT_STACK};font-size:22px;font-weight:700;letter-spacing:-0.01em;line-height:1.2;color:${TEXT};padding-bottom:10px;">Appuntamento confermato</td></tr>
    <tr><td style="color:${MUTED};font-size:15px;padding-bottom:20px;">
      Ciao ${escapeHtml(params.patientName)},
      <strong style="color:${TEXT};font-weight:600;">${escapeHtml(params.professionalName)}</strong>
      ha accettato la tua richiesta di appuntamento.
    </td></tr>
    <tr><td style="padding-bottom:20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border:1px solid ${BORDER};border-radius:10px;">
        <tr><td style="padding:18px 18px 14px;border-left:3px solid ${PRIMARY};border-top-left-radius:10px;${params.meetingUrl ? "" : "border-bottom-left-radius:10px;"}">
          <div style="color:${ACCENT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Quando</div>
          <div style="font-size:16px;font-weight:600;color:${TEXT};padding-top:6px;">${escapeHtml(when)}</div>
        </td></tr>
        <tr><td style="padding:0 18px;">
          <div style="height:1px;background:${BORDER};"></div>
        </td></tr>
        <tr><td style="padding:14px 18px ${params.meetingUrl ? "14px" : "18px"};border-left:3px solid ${PRIMARY};${params.meetingUrl ? "" : "border-bottom-left-radius:10px;"}">
          <div style="color:${ACCENT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Tipo</div>
          <div style="font-size:16px;color:${TEXT};padding-top:6px;">${escapeHtml(params.appointmentType)}</div>
        </td></tr>
        ${meetingRow}
      </table>
    </td></tr>
    ${notesRow}
    <tr><td align="center" style="padding:4px 0 24px;">
      ${button(ctaHref, ctaLabel)}
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;line-height:1.55;">
      Se non puoi più partecipare, annulla dal tuo calendario in app così
      ${escapeHtml(params.professionalName)} viene avvisato.
    </td></tr>
  `);

  const lines = [
    "Appuntamento confermato",
    "",
    `Ciao ${params.patientName},`,
    `${params.professionalName} ha accettato la tua richiesta di appuntamento.`,
    "",
    `Quando: ${when}`,
    `Tipo: ${params.appointmentType}`,
  ];
  if (params.meetingUrl) lines.push(`Videochiamata: ${params.meetingUrl}`);
  if (params.notes) lines.push(`Note: ${params.notes}`);
  lines.push("", "— Salute di Ferro");

  return { html, text: lines.join("\n"), subject };
}

// ── Appointment accepted (professional-facing, no Google linked) ──────
//
// Sent to the pro only when they accepted a request without having
// linked their Google account. The patient already got the same
// appointment info via appointmentAcceptedEmail; this one is half a
// confirmation, half a nudge to connect Google so future acceptances
// auto-mint a Meet link.

export function appointmentAcceptedProEmail(params: {
  professionalName: string;
  patientName: string;
  appointmentStart: Date;
  appointmentType: string;
  notes: string | null;
  connectGoogleUrl: string;
}): { html: string; text: string; subject: string } {
  const when = params.appointmentStart.toLocaleString("it-IT", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const subject = `Hai accettato l'appuntamento con ${params.patientName}`;

  const notesRow = params.notes
    ? `<tr><td style="color:${MUTED};font-size:14px;padding:0 0 20px;">
        <strong style="color:${TEXT};font-weight:600;">Note:</strong> ${escapeHtml(params.notes)}
      </td></tr>`
    : "";

  const html = layout(`
    <tr><td style="font-family:${FONT_STACK};font-size:22px;font-weight:700;letter-spacing:-0.01em;line-height:1.2;color:${TEXT};padding-bottom:10px;">Richiesta accettata</td></tr>
    <tr><td style="color:${MUTED};font-size:15px;padding-bottom:20px;">
      Ciao ${escapeHtml(params.professionalName)}, hai confermato l&apos;appuntamento con
      <strong style="color:${TEXT};font-weight:600;">${escapeHtml(params.patientName)}</strong>.
    </td></tr>
    <tr><td style="padding-bottom:20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border:1px solid ${BORDER};border-radius:10px;">
        <tr><td style="padding:18px 18px 14px;border-left:3px solid ${PRIMARY};border-top-left-radius:10px;">
          <div style="color:${ACCENT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Quando</div>
          <div style="font-size:16px;font-weight:600;color:${TEXT};padding-top:6px;">${escapeHtml(when)}</div>
        </td></tr>
        <tr><td style="padding:0 18px;">
          <div style="height:1px;background:${BORDER};"></div>
        </td></tr>
        <tr><td style="padding:14px 18px 18px;border-left:3px solid ${PRIMARY};border-bottom-left-radius:10px;">
          <div style="color:${ACCENT};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">Tipo</div>
          <div style="font-size:16px;color:${TEXT};padding-top:6px;">${escapeHtml(params.appointmentType)}</div>
        </td></tr>
      </table>
    </td></tr>
    ${notesRow}
    <tr><td style="padding:0 0 16px;">
      <div style="background:${BG};border:1px solid ${BORDER};border-radius:10px;padding:16px;">
        <div style="font-size:14px;font-weight:600;color:${TEXT};padding-bottom:6px;">Collega Google Calendar per generare un link Meet automatico</div>
        <div style="color:${MUTED};font-size:13px;padding-bottom:12px;line-height:1.5;">
          Per gli appuntamenti futuri, collegando il tuo account Google creiamo
          un link Meet e aggiungiamo l&apos;evento al tuo calendario non appena
          accetti una richiesta.
        </div>
        ${button(params.connectGoogleUrl, "Collega Google Calendar")}
      </div>
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;line-height:1.55;">
      Per questo appuntamento, condividi tu il link della videochiamata con
      ${escapeHtml(params.patientName)} (puoi incollarlo nei dettagli
      dell&apos;appuntamento in app).
    </td></tr>
  `);

  const lines = [
    "Richiesta accettata",
    "",
    `Ciao ${params.professionalName},`,
    `hai confermato l'appuntamento con ${params.patientName}.`,
    "",
    `Quando: ${when}`,
    `Tipo: ${params.appointmentType}`,
  ];
  if (params.notes) lines.push(`Note: ${params.notes}`);
  lines.push(
    "",
    "Collega Google Calendar per generare un link Meet automatico:",
    params.connectGoogleUrl,
    "",
    "— Salute di Ferro",
  );

  return { html, text: lines.join("\n"), subject };
}
