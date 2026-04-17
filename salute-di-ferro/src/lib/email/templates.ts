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

const BRAND_COLOR = "#c9a96e"; // primary accent
const BG = "#0a0a0a";
const CARD = "#1a1a1a";
const TEXT = "#fafafa";
const MUTED = "#a1a1a1";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(inner: string) {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Salute di Ferro</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.5;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:${CARD};border-radius:12px;padding:32px;">
          <tr><td align="center" style="padding-bottom:16px;">
            <div style="display:inline-block;width:56px;height:56px;border:1px solid ${BRAND_COLOR}66;border-radius:999px;line-height:54px;color:${BRAND_COLOR};font-weight:700;font-family:monospace;">SDF</div>
          </td></tr>
          ${inner}
          <tr><td style="padding-top:32px;border-top:1px solid #2a2a2a;color:${MUTED};font-size:11px;text-align:center;">
            Stai ricevendo questa email perché sei registrato su Salute di Ferro.<br/>
            Per domande rispondi a info@salutediferro.com.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:${BRAND_COLOR};color:${BG};padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">${label}</a>`;
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
    params.professionalRole === "DOCTOR" ? "il medico" : "il coach";
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
      come suo paziente. Clicca il bottone qui sotto per completare la registrazione;
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
    `${params.professionalName} ti ha invitato su Salute di Ferro come suo paziente.`,
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
    <tr><td style="font-size:18px;font-weight:600;padding-bottom:12px;">${headline}</td></tr>
    <tr><td style="color:${MUTED};padding-bottom:16px;">
      Ciao ${escapeHtml(params.recipientName)}, ricordati del tuo appuntamento con
      <strong style="color:${TEXT};">${escapeHtml(params.counterpartName)}</strong>.
    </td></tr>
    <tr><td style="padding-bottom:16px;">
      <div style="background:${BG};border-radius:8px;padding:16px;border:1px solid #2a2a2a;">
        <div style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;">Quando</div>
        <div style="font-size:15px;font-weight:500;padding-top:4px;">${escapeHtml(when)}</div>
        <div style="color:${MUTED};font-size:12px;text-transform:uppercase;letter-spacing:0.05em;padding-top:12px;">Tipo</div>
        <div style="font-size:15px;padding-top:4px;">${escapeHtml(params.appointmentType)}</div>
      </div>
    </td></tr>
    <tr><td align="center" style="padding:8px 0 24px;">
      ${button(ctaHref, ctaLabel)}
    </td></tr>
    <tr><td style="color:${MUTED};font-size:12px;">
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
