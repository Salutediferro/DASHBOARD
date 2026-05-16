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
 *
 * Visual language mirrors the dashboard (`src/app/globals.css`):
 *   chrome-silver + brand-red on near-black, chrome gradient accents.
 *   Outlook strips `background-image` (gradients) and `border-radius`,
 *   so every gradient has a solid `background-color` fallback and the
 *   layout still reads cleanly as flat blocks.
 */

// Design tokens — kept in sync with src/app/globals.css :root.
// Email clients can't read CSS variables, so values are hardcoded here.
const BG = "#0a0a0a";
const CARD = "#1a1a1a"; // outer card — deeper than dashboard `--card` so
//                         the inner info blocks (which use `--card`) lift.
const CARD_INNER = "#2f2f2f";
const BORDER = "#3a3a3a";
const BORDER_FAINT = "#2a2a2a";
const TEXT = "#fafafa";
const MUTED = "#a1a1a1";
const PRIMARY = "#b22222"; // brand red
const PRIMARY_DARK = "#7a1717";
const ACCENT = "#c0c0c0"; // chrome silver
const ACCENT_DEEP = "#8a8a8a";
const FONT_STACK =
  '"Avenir Next","Avenir","Manrope",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif';

// Brand assets — absolute URL so inbox image proxies (Gmail, Yahoo) can
// fetch and cache. SVG renders crisp on Apple Mail / iOS / Gmail; Outlook
// desktop falls back to the `alt` text inside a styled chrome box.
const LOGO_URL = "https://my.salutediferro.com/logo-sdf.svg";
const SITE_URL = "https://salutediferro.com";
const TAGLINE = "Allena la tua forza, cura la tua salute.";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Hero brand block — full SVG logo + wordmark, centered. The logo is
// fetched from `my.salutediferro.com` so inbox proxies cache it once.
// Clients that block remote images show the alt text inside a chrome
// gradient pill — still recognizable as the brand.
function brandHero() {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
      <tr><td align="center" style="padding:36px 24px 8px;">
        <img src="${LOGO_URL}" alt="Salute di Ferro" width="64" height="auto"
          style="display:block;width:64px;height:auto;border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic;" />
      </td></tr>
      <tr><td align="center" style="padding:14px 24px 0;">
        <div style="font-family:${FONT_STACK};font-weight:800;font-size:14px;letter-spacing:0.16em;text-transform:uppercase;line-height:1;">
          <span style="color:${ACCENT};">SALUTE</span>&nbsp;<span style="color:${PRIMARY};">DI FERRO</span>
        </div>
      </td></tr>
    </table>`;
}

// Bulletproof-ish CTA. The solid `background-color` is the Outlook
// fallback (Outlook strips `background-image`); on every other client
// the chrome-tinted red gradient renders with a subtle inner highlight
// via the top-edge box-shadow.
function button(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;margin:0 auto;">
    <tr><td align="center" style="background-color:${PRIMARY};background-image:linear-gradient(135deg,${PRIMARY} 0%,${PRIMARY_DARK} 100%);border-radius:10px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.18),0 6px 14px -4px rgba(178,34,34,0.45),0 2px 4px -2px rgba(0,0,0,0.6);">
      <a href="${href}" style="display:inline-block;padding:14px 30px;color:${TEXT};text-decoration:none;font-family:${FONT_STACK};font-weight:700;font-size:14px;letter-spacing:0.04em;text-transform:uppercase;line-height:1;">${label}</a>
    </td></tr>
  </table>`;
}

// Ghost / secondary CTA — used inside nested info cards where a full
// red button would compete with the primary CTA above it.
function ghostButton(href: string, label: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;">
    <tr><td align="center" style="background-color:${BG};border:1px solid ${ACCENT_DEEP};border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:10px 20px;color:${ACCENT};text-decoration:none;font-family:${FONT_STACK};font-weight:600;font-size:13px;letter-spacing:0.02em;line-height:1;">${label}</a>
    </td></tr>
  </table>`;
}

// Elegant key/value list with a vertical brand-red rule. Used by the
// appointment templates to render Quando / Tipo / Videochiamata blocks.
// Each row collapses cleanly in Outlook (no border-radius, no flex).
function infoCard(
  rows: Array<{ label: string; value: string; isLink?: boolean }>,
) {
  const inner = rows
    .map((r, i) => {
      const isFirst = i === 0;
      const isLast = i === rows.length - 1;
      const padTop = isFirst ? 18 : 14;
      const padBottom = isLast ? 18 : 14;
      const valueHtml = r.isLink
        ? `<a href="${r.value}" style="color:${TEXT};text-decoration:none;word-break:break-all;">${escapeHtml(r.value)}</a>`
        : escapeHtml(r.value);
      const divider = isLast
        ? ""
        : `<tr><td style="padding:0 20px;">
            <div style="height:1px;background:${BORDER_FAINT};line-height:1px;font-size:0;">&nbsp;</div>
          </td></tr>`;
      return `
        <tr><td style="padding:${padTop}px 20px ${isLast ? padBottom : 10}px 17px;border-left:3px solid ${PRIMARY};">
          <div style="color:${ACCENT};font-family:${FONT_STACK};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.14em;line-height:1;">${escapeHtml(r.label)}</div>
          <div style="font-family:${FONT_STACK};font-size:${r.isLink ? 13 : 16}px;font-weight:600;color:${TEXT};padding-top:8px;line-height:1.4;">${valueHtml}</div>
        </td></tr>
        ${divider}`;
    })
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};border:1px solid ${BORDER};border-radius:12px;border-collapse:separate;">
    ${inner}
  </table>`;
}

// Page heading — display weight, tight tracking, mirrors `.text-display`.
function heading(text: string) {
  return `<div style="font-family:${FONT_STACK};font-size:26px;font-weight:800;letter-spacing:-0.02em;line-height:1.15;color:${TEXT};">${text}</div>`;
}

// Lead paragraph — slightly larger than body copy, muted.
function lead(html: string) {
  return `<div style="font-family:${FONT_STACK};font-size:15px;line-height:1.6;color:${MUTED};">${html}</div>`;
}

function layout(inner: string) {
  return `<!doctype html>
<html lang="it">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="dark light" />
  <meta name="supported-color-schemes" content="dark light" />
  <title>Salute di Ferro</title>
</head>
<body style="margin:0;padding:0;background:${BG};color:${TEXT};font-family:${FONT_STACK};line-height:1.55;-webkit-font-smoothing:antialiased;">
  <!-- Preheader space-eater so Gmail doesn't preview the chrome strip's alt text. -->
  <div style="display:none;font-size:1px;color:${BG};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">&zwnj;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};">
    <tr>
      <!-- 3px chrome→red gradient strip — premium hairline at the very top. -->
      <td style="background-color:${ACCENT};background-image:linear-gradient(90deg,${ACCENT} 0%,${ACCENT_DEEP} 50%,${PRIMARY} 100%);height:3px;line-height:3px;font-size:0;">&nbsp;</td>
    </tr>
    <tr>
      <td align="center" style="padding:40px 16px 32px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;border-collapse:separate;">

          <!-- ── Brand hero (logo + wordmark, centered) ───────── -->
          <tr><td align="center" style="padding-bottom:24px;">
            ${brandHero()}
          </td></tr>

          <!-- ── Content card ─────────────────────────────────── -->
          <tr><td style="background:${CARD};border:1px solid ${BORDER};border-radius:14px;box-shadow:0 1px 0 rgba(192,192,192,0.06),0 18px 36px -10px rgba(0,0,0,0.6),0 6px 14px -6px rgba(0,0,0,0.5);">
            <!-- Inner padding wrapper so border-radius doesn't clip child borders in Outlook. -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
              <tr><td style="padding:36px 36px 32px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${inner}
                </table>
              </td></tr>
            </table>
          </td></tr>

          <!-- ── Tagline ──────────────────────────────────────── -->
          <tr><td align="center" style="padding:28px 24px 6px;">
            <div style="font-family:${FONT_STACK};font-size:13px;font-style:italic;color:${ACCENT_DEEP};letter-spacing:0.01em;line-height:1.5;">${TAGLINE}</div>
          </td></tr>

          <!-- ── Footer ───────────────────────────────────────── -->
          <tr><td align="center" style="padding:18px 24px 8px;">
            <div style="font-family:${FONT_STACK};font-size:11px;color:${MUTED};line-height:1.6;">
              <a href="${SITE_URL}/privacy" style="color:${MUTED};text-decoration:none;">Privacy</a>
              <span style="color:${BORDER};">&nbsp;·&nbsp;</span>
              <a href="${SITE_URL}/cookie-policy" style="color:${MUTED};text-decoration:none;">Cookie</a>
              <span style="color:${BORDER};">&nbsp;·&nbsp;</span>
              <a href="${SITE_URL}/terms" style="color:${MUTED};text-decoration:none;">Termini</a>
              <span style="color:${BORDER};">&nbsp;·&nbsp;</span>
              <a href="https://instagram.com/salutediferro" style="color:${MUTED};text-decoration:none;">Instagram</a>
              <span style="color:${BORDER};">&nbsp;·&nbsp;</span>
              <a href="https://youtube.com/@salutediferro" style="color:${MUTED};text-decoration:none;">YouTube</a>
            </div>
          </td></tr>

          <tr><td align="center" style="padding:10px 24px 0;">
            <div style="font-family:${FONT_STACK};font-size:11px;color:${MUTED};line-height:1.6;">
              Domande? Scrivici a <a href="mailto:info@salutediferro.com" style="color:${ACCENT};text-decoration:none;">info@salutediferro.com</a>
            </div>
          </td></tr>

          <tr><td align="center" style="padding:14px 24px 0;">
            <div style="font-family:${FONT_STACK};font-size:10px;color:${ACCENT_DEEP};letter-spacing:0.06em;text-transform:uppercase;line-height:1.6;">
              &copy; Salute di Ferro
            </div>
          </td></tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Invitation ────────────────────────────────────────────────────────
//
// Two variants share the same shell:
//
//   1. **Professional-initiated** (`professionalName` + `professionalRole`
//      both set): a DOCTOR or COACH onboarded a specific patient. The
//      copy names them and previews the auto-link.
//   2. **Stripe-purchased** (`professionalName === null`): the buyer
//      just paid. There's no pro yet — the copy welcomes them, frames
//      the link as completing the purchase, and explains they'll pick
//      a pro inside the app afterward.

export function invitationEmail(params: {
  inviteUrl: string;
  /** Null = Stripe-purchased invite (no professional attached yet). */
  professionalName: string | null;
  /** Null when `professionalName` is null. */
  professionalRole: "DOCTOR" | "COACH" | null;
  expiresAt: Date;
  firstName?: string | null;
}): { html: string; text: string } {
  const isStripe = !params.professionalName;
  const greeting = params.firstName
    ? `Ciao ${escapeHtml(params.firstName)},`
    : "Ciao,";
  const expiry = params.expiresAt.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const headingText = isStripe ? "Benvenuto in Salute di Ferro" : "Sei stato invitato";

  const introHtml = isStripe
    ? `Grazie per esserti unito a <strong style="color:${TEXT};font-weight:600;">Salute di Ferro</strong>. Completa la registrazione qui sotto per accedere al tuo account — una volta dentro potrai scegliere il professionista o il coach con cui lavorare.`
    : `${escapeHtml(params.professionalName ?? "")} ti ha invitato a entrare su <strong style="color:${TEXT};font-weight:600;">Salute di Ferro</strong> come suo cliente. Completa la registrazione qui sotto — al termine sarai collegato automaticamente a ${params.professionalRole === "DOCTOR" ? "il professionista" : "il coach"}.`;

  const introText = isStripe
    ? "Grazie per esserti unito a Salute di Ferro. Completa la registrazione al link qui sotto per accedere al tuo account — una volta dentro potrai scegliere il professionista o il coach con cui lavorare."
    : `${params.professionalName} ti ha invitato su Salute di Ferro come suo cliente. Completa la registrazione al link qui sotto — sarai collegato automaticamente al ${params.professionalRole === "DOCTOR" ? "professionista" : "coach"}.`;

  const html = layout(`
    <tr><td style="padding-bottom:14px;">${heading(headingText)}</td></tr>
    <tr><td style="padding-bottom:8px;">
      <div style="font-family:${FONT_STACK};font-size:16px;font-weight:600;color:${TEXT};">${greeting}</div>
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      ${lead(introHtml)}
    </td></tr>
    <tr><td align="center" style="padding:4px 0 28px;">
      ${button(params.inviteUrl, "Completa la registrazione")}
    </td></tr>
    <tr><td style="padding-bottom:14px;">
      <div style="font-family:${FONT_STACK};font-size:13px;color:${MUTED};line-height:1.6;">
        Il link scade il <strong style="color:${TEXT};font-weight:600;">${expiry}</strong> ed è a uso singolo. Se non riconosci ${isStripe ? "questa email" : "l&apos;invito"} puoi ignorarla.
      </div>
    </td></tr>
    <tr><td style="padding-top:14px;border-top:1px solid ${BORDER_FAINT};">
      <div style="font-family:${FONT_STACK};font-size:11px;color:${MUTED};line-height:1.55;word-break:break-all;">
        Se il bottone non funziona, copia e incolla nel browser:<br/>
        <span style="color:${ACCENT};">${escapeHtml(params.inviteUrl)}</span>
      </div>
    </td></tr>
  `);

  const text = [
    greeting,
    "",
    introText,
    "",
    params.inviteUrl,
    "",
    `Il link scade il ${expiry} ed è a uso singolo.`,
    `Se non riconosci ${isStripe ? "questa email" : "l'invito"}, ignorala.`,
    "",
    "— Salute di Ferro",
    "Allena la tua forza, cura la tua salute.",
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
    <tr><td style="padding-bottom:14px;">${heading(`Benvenuto, ${firstName}`)}</td></tr>
    <tr><td style="padding-bottom:24px;">
      ${lead(`Il tuo account <strong style="color:${TEXT};font-weight:600;">${roleLabel}</strong> su <strong style="color:${TEXT};font-weight:600;">Salute di Ferro</strong> è stato creato. Per attivarlo imposta una password personale — scegli qualcosa di robusto e che solo tu conosci.`)}
    </td></tr>
    <tr><td align="center" style="padding:4px 0 28px;">
      ${button(params.setupUrl, "Imposta la password")}
    </td></tr>
    <tr><td style="padding:0 0 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BG};border:1px solid ${BORDER};border-radius:12px;border-collapse:separate;">
        <tr><td style="padding:18px 20px;">
          <div style="font-family:${FONT_STACK};font-size:10px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.14em;padding-bottom:10px;">Due cose importanti</div>
          <div style="font-family:${FONT_STACK};font-size:13.5px;color:${TEXT};line-height:1.6;padding-bottom:8px;">
            <strong style="color:${PRIMARY};font-weight:700;">1.</strong>&nbsp; Attiva l&apos;autenticazione a due fattori (2FA) dal tuo profilo appena entri — è obbligatoria per chi gestisce dati clinici.
          </div>
          <div style="font-family:${FONT_STACK};font-size:13.5px;color:${TEXT};line-height:1.6;">
            <strong style="color:${PRIMARY};font-weight:700;">2.</strong>&nbsp; Se hai ricevuto questa email senza averla richiesta, ignorala e segnalaci il problema.
          </div>
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding-bottom:14px;">
      <div style="font-family:${FONT_STACK};font-size:13px;color:${MUTED};line-height:1.6;">
        Per motivi di sicurezza il link scade entro <strong style="color:${TEXT};font-weight:600;">24 ore</strong>. Se scade, scrivici a <a href="mailto:info@salutediferro.com" style="color:${ACCENT};text-decoration:none;">info@salutediferro.com</a> e te ne invieremo uno nuovo.
      </div>
    </td></tr>
    <tr><td style="padding-top:14px;border-top:1px solid ${BORDER_FAINT};">
      <div style="font-family:${FONT_STACK};font-size:11px;color:${MUTED};line-height:1.55;word-break:break-all;">
        Se il bottone non funziona, copia e incolla nel browser:<br/>
        <span style="color:${ACCENT};">${escapeHtml(params.setupUrl)}</span>
      </div>
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
    "Allena la tua forza, cura la tua salute.",
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
    <tr><td style="padding-bottom:14px;">${heading("Reset della password")}</td></tr>
    <tr><td style="padding-bottom:8px;">
      <div style="font-family:${FONT_STACK};font-size:16px;font-weight:600;color:${TEXT};">Ciao ${firstName},</div>
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      ${lead(`un amministratore di <strong style="color:${TEXT};font-weight:600;">Salute di Ferro</strong> ha avviato un reset della tua password. Clicca qui sotto per sceglierne una nuova e rientrare nel tuo account.`)}
    </td></tr>
    <tr><td align="center" style="padding:4px 0 28px;">
      ${button(params.resetUrl, "Imposta nuova password")}
    </td></tr>
    <tr><td style="padding-bottom:14px;">
      <div style="font-family:${FONT_STACK};font-size:13px;color:${MUTED};line-height:1.6;">
        Il link scade entro <strong style="color:${TEXT};font-weight:600;">24 ore</strong>. Se non hai richiesto tu il reset ma riconosci questa email, rispondi a <a href="mailto:info@salutediferro.com" style="color:${ACCENT};text-decoration:none;">info@salutediferro.com</a> così verifichiamo.
      </div>
    </td></tr>
    <tr><td style="padding-top:14px;border-top:1px solid ${BORDER_FAINT};">
      <div style="font-family:${FONT_STACK};font-size:11px;color:${MUTED};line-height:1.55;word-break:break-all;">
        Se il bottone non funziona, copia e incolla nel browser:<br/>
        <span style="color:${ACCENT};">${escapeHtml(params.resetUrl)}</span>
      </div>
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
    "Allena la tua forza, cura la tua salute.",
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
    params.hoursUntil <= 2 ? `Appuntamento tra un'ora` : `Promemoria appuntamento`;

  const subject = `${headline} — ${params.appointmentType} con ${params.counterpartName}`;
  const ctaLabel = params.meetingUrl
    ? "Entra nella videochiamata"
    : "Vedi i dettagli";
  const ctaHref = params.meetingUrl ?? `${params.appUrl}/dashboard`;

  const rows: Array<{ label: string; value: string; isLink?: boolean }> = [
    { label: "Quando", value: when },
    { label: "Tipo", value: params.appointmentType },
  ];
  if (params.meetingUrl) {
    rows.push({ label: "Videochiamata", value: params.meetingUrl, isLink: true });
  }

  const html = layout(`
    <tr><td style="padding-bottom:14px;">${heading(headline)}</td></tr>
    <tr><td style="padding-bottom:24px;">
      ${lead(`Ciao ${escapeHtml(params.recipientName)}, ricordati del tuo appuntamento con <strong style="color:${TEXT};font-weight:600;">${escapeHtml(params.counterpartName)}</strong>.`)}
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      ${infoCard(rows)}
    </td></tr>
    <tr><td align="center" style="padding:0 0 22px;">
      ${button(ctaHref, ctaLabel)}
    </td></tr>
    <tr><td style="padding-top:14px;border-top:1px solid ${BORDER_FAINT};">
      <div style="font-family:${FONT_STACK};font-size:12px;color:${MUTED};line-height:1.6;">
        Se non puoi partecipare, annulla dal tuo calendario in app così l&apos;altra persona viene avvisata.
      </div>
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
    params.meetingUrl
      ? `Videochiamata: ${params.meetingUrl}`
      : `Dettagli: ${params.appUrl}/dashboard`,
    "",
    "— Salute di Ferro",
    "Allena la tua forza, cura la tua salute.",
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
    <tr><td style="padding-bottom:14px;">${heading(subject)}</td></tr>
    <tr><td style="padding-bottom:8px;">
      <div style="font-family:${FONT_STACK};font-size:16px;font-weight:600;color:${TEXT};">${greeting}</div>
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      ${lead(`è il momento del tuo supplemento programmato per le <strong style="color:${TEXT};font-weight:600;">${escapeHtml(params.timeLabel)}</strong>. Apri Salute di Ferro per vedere quale e segnare l&apos;assunzione.`)}
    </td></tr>
    <tr><td align="center" style="padding:4px 0 28px;">
      ${button(params.deepLinkUrl, "Apri promemoria")}
    </td></tr>
    <tr><td style="padding-top:14px;border-top:1px solid ${BORDER_FAINT};">
      <div style="font-family:${FONT_STACK};font-size:12px;color:${MUTED};line-height:1.6;">
        Per privacy non includiamo dettagli del supplemento in questa email. Se non vuoi più ricevere questi promemoria, disattivali nella scheda del supplemento all&apos;interno dell&apos;app.
      </div>
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
    "Allena la tua forza, cura la tua salute.",
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

  const rows: Array<{ label: string; value: string; isLink?: boolean }> = [
    { label: "Quando", value: when },
    { label: "Tipo", value: params.appointmentType },
  ];
  if (params.meetingUrl) {
    rows.push({ label: "Videochiamata", value: params.meetingUrl, isLink: true });
  }

  const notesRow = params.notes
    ? `<tr><td style="padding:0 0 24px;">
        <div style="background:${BG};border:1px solid ${BORDER};border-radius:12px;padding:18px 20px;">
          <div style="font-family:${FONT_STACK};font-size:10px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.14em;padding-bottom:8px;">Note del professionista</div>
          <div style="font-family:${FONT_STACK};font-size:14px;color:${TEXT};line-height:1.55;">${escapeHtml(params.notes)}</div>
        </div>
      </td></tr>`
    : "";

  const html = layout(`
    <tr><td style="padding-bottom:14px;">${heading("Appuntamento confermato")}</td></tr>
    <tr><td style="padding-bottom:24px;">
      ${lead(`Ciao ${escapeHtml(params.patientName)}, <strong style="color:${TEXT};font-weight:600;">${escapeHtml(params.professionalName)}</strong> ha accettato la tua richiesta di appuntamento.`)}
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      ${infoCard(rows)}
    </td></tr>
    ${notesRow}
    <tr><td align="center" style="padding:0 0 22px;">
      ${button(ctaHref, ctaLabel)}
    </td></tr>
    <tr><td style="padding-top:14px;border-top:1px solid ${BORDER_FAINT};">
      <div style="font-family:${FONT_STACK};font-size:12px;color:${MUTED};line-height:1.6;">
        Se non puoi più partecipare, annulla dal tuo calendario in app così ${escapeHtml(params.professionalName)} viene avvisato.
      </div>
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
  lines.push("", "— Salute di Ferro", "Allena la tua forza, cura la tua salute.");

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
    ? `<tr><td style="padding:0 0 24px;">
        <div style="background:${BG};border:1px solid ${BORDER};border-radius:12px;padding:18px 20px;">
          <div style="font-family:${FONT_STACK};font-size:10px;font-weight:700;color:${ACCENT};text-transform:uppercase;letter-spacing:0.14em;padding-bottom:8px;">Note</div>
          <div style="font-family:${FONT_STACK};font-size:14px;color:${TEXT};line-height:1.55;">${escapeHtml(params.notes)}</div>
        </div>
      </td></tr>`
    : "";

  const html = layout(`
    <tr><td style="padding-bottom:14px;">${heading("Richiesta accettata")}</td></tr>
    <tr><td style="padding-bottom:24px;">
      ${lead(`Ciao ${escapeHtml(params.professionalName)}, hai confermato l&apos;appuntamento con <strong style="color:${TEXT};font-weight:600;">${escapeHtml(params.patientName)}</strong>.`)}
    </td></tr>
    <tr><td style="padding-bottom:24px;">
      ${infoCard([
        { label: "Quando", value: when },
        { label: "Tipo", value: params.appointmentType },
      ])}
    </td></tr>
    ${notesRow}
    <tr><td style="padding:0 0 22px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CARD_INNER};border:1px solid ${BORDER};border-radius:12px;border-collapse:separate;">
        <tr><td style="padding:20px 22px;">
          <div style="font-family:${FONT_STACK};font-size:10px;font-weight:700;color:${PRIMARY};text-transform:uppercase;letter-spacing:0.14em;padding-bottom:10px;">Suggerimento</div>
          <div style="font-family:${FONT_STACK};font-size:15px;font-weight:600;color:${TEXT};line-height:1.4;padding-bottom:8px;">Collega Google Calendar per generare un link Meet automatico</div>
          <div style="font-family:${FONT_STACK};font-size:13px;color:${MUTED};line-height:1.6;padding-bottom:16px;">
            Per gli appuntamenti futuri, collegando il tuo account Google creiamo un link Meet e aggiungiamo l&apos;evento al tuo calendario non appena accetti una richiesta.
          </div>
          ${ghostButton(params.connectGoogleUrl, "Collega Google Calendar")}
        </td></tr>
      </table>
    </td></tr>
    <tr><td style="padding-top:14px;border-top:1px solid ${BORDER_FAINT};">
      <div style="font-family:${FONT_STACK};font-size:12px;color:${MUTED};line-height:1.6;">
        Per questo appuntamento, condividi tu il link della videochiamata con ${escapeHtml(params.patientName)} (puoi incollarlo nei dettagli dell&apos;appuntamento in app).
      </div>
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
    "Allena la tua forza, cura la tua salute.",
  );

  return { html, text: lines.join("\n"), subject };
}
