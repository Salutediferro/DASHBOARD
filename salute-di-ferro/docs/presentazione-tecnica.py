from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak,
    Table, TableStyle, KeepTogether, ListFlowable, ListItem
)

OUTPUT = "/Users/gabriele/Desktop/DASHBOARD/salute-di-ferro/docs/Salute-di-Ferro-Presentazione-Tecnica.pdf"

ACCENT = HexColor("#0F4C81")
ACCENT_LIGHT = HexColor("#E6EEF7")
MUTED = HexColor("#5B6B7B")
BORDER = HexColor("#D6DEE6")

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=26, leading=30,
    textColor=ACCENT, alignment=TA_LEFT, spaceAfter=6,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontName="Helvetica", fontSize=12, leading=16,
    textColor=MUTED, alignment=TA_LEFT, spaceAfter=20,
)
h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=16, leading=20,
    textColor=ACCENT, spaceBefore=14, spaceAfter=8,
)
h2_style = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=12, leading=16,
    textColor=black, spaceBefore=10, spaceAfter=4,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=14,
    textColor=black, alignment=TA_JUSTIFY, spaceAfter=4,
)
small_style = ParagraphStyle(
    "Small", parent=styles["Normal"],
    fontName="Helvetica", fontSize=9, leading=12, textColor=MUTED,
)
code_style = ParagraphStyle(
    "Code", parent=styles["Code"],
    fontName="Courier", fontSize=9, leading=12,
    textColor=black, backColor=ACCENT_LIGHT,
    leftIndent=8, rightIndent=8, spaceBefore=4, spaceAfter=8,
)
list_item_style = ParagraphStyle(
    "ListItem", parent=body_style, spaceAfter=2, leading=13,
)


def kv_table(rows):
    t = Table(rows, colWidths=[4.5 * cm, 11.5 * cm])
    t.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, -1), "Helvetica", 9.5),
        ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 9.5),
        ("TEXTCOLOR", (0, 0), (0, -1), ACCENT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LINEBELOW", (0, 0), (-1, -2), 0.3, BORDER),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def section_header(text):
    return Paragraph(text, h1_style)


def bullets(items):
    flow = ListFlowable(
        [ListItem(Paragraph(i, list_item_style), leftIndent=10, bulletColor=ACCENT) for i in items],
        bulletType="bullet", bulletFontSize=7, bulletOffsetY=-2,
        leftIndent=14, bulletFontName="Helvetica-Bold",
    )
    return flow


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(2 * cm, 1.2 * cm, "Salute di Ferro - Documento tecnico")
    canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Pag. {doc.page}")
    canvas.setStrokeColor(BORDER)
    canvas.setLineWidth(0.3)
    canvas.line(2 * cm, 1.5 * cm, A4[0] - 2 * cm, 1.5 * cm)
    canvas.restoreState()


doc = SimpleDocTemplate(
    OUTPUT, pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm,
    topMargin=2 * cm, bottomMargin=2 * cm,
    title="Salute di Ferro - Presentazione Tecnica",
    author="Team Salute di Ferro",
)

story = []

# Cover-ish header
story.append(Paragraph("Salute di Ferro", title_style))
story.append(Paragraph(
    "Dashboard sanitaria multi-ruolo - Panoramica tecnica per dev / CTO",
    subtitle_style,
))

story.append(kv_table([
    ["Progetto", "Salute di Ferro - piattaforma SaaS sanitaria multi-ruolo (paziente, medico, coach, admin)"],
    ["Repository", "monorepo: <b>salute-di-ferro</b> (web Next.js) + <b>sdf-mobile</b> (Expo / React Native)"],
    ["Team", "Andrea Brognera, Simone (co-founder Leone)"],
    ["Consegna target", "fine maggio 2026"],
    ["Hosting", "Vercel + Supabase (PostgreSQL gestito)"],
]))
story.append(Spacer(1, 16))

# 1. Sintesi
story.append(section_header("1. Sintesi"))
story.append(Paragraph(
    "Salute di Ferro e' una piattaforma web (con companion mobile) per la gestione del percorso "
    "di cura tra pazienti, medici, coach e amministratori. Centralizza appuntamenti, dati biometrici, "
    "referti medici, terapie, diario nutrizionale e messaggistica 1:1. L'architettura e' pensata per "
    "ambito sanitario: 2FA obbligatoria per i ruoli clinici, audit log GDPR-ready, rate limiting "
    "distribuito e separazione netta dei permessi role-based.",
    body_style,
))

# 2. Stack
story.append(section_header("2. Stack tecnologico"))

story.append(Paragraph("Framework & runtime", h2_style))
story.append(kv_table([
    ["Next.js", "16.2.3 (App Router, Route Handlers, Server Actions)"],
    ["React", "19.2.4 (+ React DOM 19.2.4)"],
    ["TypeScript", "5.x - strict mode"],
    ["Node.js", "runtime Vercel"],
]))
story.append(Spacer(1, 8))

story.append(Paragraph("Persistenza & auth", h2_style))
story.append(kv_table([
    ["Database", "PostgreSQL su Supabase (multi-schema: public + auth)"],
    ["ORM", "Prisma 7.7.0 (@prisma/adapter-pg, @prisma/client)"],
    ["Autenticazione", "Supabase Auth (@supabase/ssr 0.10, @supabase/supabase-js 2.103)"],
    ["2FA", "Gate AAL2 forzato per DOCTOR / COACH / ADMIN (rollout via feature flag)"],
]))
story.append(Spacer(1, 8))

story.append(Paragraph("UI, form, state", h2_style))
story.append(kv_table([
    ["UI kit", "shadcn/ui + Base UI 1.4 + Tailwind CSS 4"],
    ["Iconografia", "Lucide React 1.8"],
    ["Form & validazione", "React Hook Form 7.72 + Zod 4.3 + @hookform/resolvers"],
    ["Data fetching", "TanStack Query 5.99"],
    ["State client", "Zustand 5.0 (store leggeri per UI state)"],
    ["Grafici", "Recharts 3.8"],
    ["Drag &amp; drop", "@dnd-kit/core 6.3 + sortable 10.0"],
    ["Tema", "next-themes 0.4 (light / dark)"],
]))
story.append(Spacer(1, 8))

story.append(Paragraph("Integrazioni & piattaforma", h2_style))
story.append(kv_table([
    ["Pagamenti", "Stripe 22 (server) + @stripe/stripe-js 9 (client), webhook handler dedicato"],
    ["Email", "Resend 6.12 (transazionali)"],
    ["AI", "Vercel AI SDK 6 + @ai-sdk/openai 3"],
    ["Rate limiting", "Upstash Redis 1.37 + @upstash/ratelimit 2 (sliding window)"],
    ["Feature flags", "Upstash Redis (con fallback su env)"],
    ["Monitoring", "Sentry (@sentry/nextjs 10.49) - error tracking + health check"],
]))
story.append(Spacer(1, 8))

story.append(Paragraph("Tooling", h2_style))
story.append(bullets([
    "ESLint 9 + eslint-config-next 16, Prettier + prettier-plugin-tailwindcss",
    "tsx 4.21 per script TS (seed Prisma, utility)",
    "Conventional Commits, branch obbligatorio (mai lavorare su <b>main</b>)",
]))

story.append(PageBreak())

# 3. Architettura
story.append(section_header("3. Architettura"))

story.append(Paragraph("Struttura cartelle (estratto)", h2_style))
story.append(Paragraph(
    "<font face='Courier' size='8.5'>"
    "src/<br/>"
    "&nbsp;&nbsp;app/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;(auth)/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# layout group auth<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;(legal)/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# pagine legali<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;(dev)/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# debug / role bypass<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;dashboard/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;admin/&nbsp;|&nbsp;doctor/&nbsp;|&nbsp;coach/&nbsp;|&nbsp;patient/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;messages/&nbsp;|&nbsp;settings/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;api/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;cron/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# job schedulati Vercel<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;stripe/&nbsp;&nbsp;&nbsp;&nbsp;# webhook<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;[resource]/route.ts<br/>"
    "&nbsp;&nbsp;components/&nbsp;&nbsp;&nbsp;&nbsp;# UI riusabili<br/>"
    "&nbsp;&nbsp;lib/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;auth/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# require-role, helper RBAC<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;supabase/&nbsp;&nbsp;&nbsp;&nbsp;# client / server / middleware<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;services/&nbsp;&nbsp;&nbsp;&nbsp;# logica di dominio<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;queries/&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# query Prisma per modulo<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;email/&nbsp;|&nbsp;calendar/&nbsp;|&nbsp;health/<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;medical-records/&nbsp;&nbsp;# upload referti<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;audit.ts&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;# audit log GDPR<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;rate-limit.ts<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;platform-settings.ts # feature flag Redis<br/>"
    "&nbsp;&nbsp;&nbsp;&nbsp;prisma.ts<br/>"
    "&nbsp;&nbsp;styles/&nbsp;|&nbsp;types/"
    "</font>",
    body_style,
))

story.append(Paragraph("Pattern principali", h2_style))
story.append(bullets([
    "<b>App Router</b> con <i>route groups</i> per separare layout (auth, legal, dev, dashboard).",
    "<b>Route Handlers</b> (<font face='Courier' size='9'>app/api/*/route.ts</font>) per le API REST interne e i webhook.",
    "<b>Middleware globale</b> (<font face='Courier' size='9'>src/lib/supabase/middleware.ts</font>) per session refresh + redirect non autenticati.",
    "<b>RBAC server-side</b> tramite helper <font face='Courier' size='9'>require-role.ts</font> applicato in ogni page/server action protetta.",
    "<b>Cron Vercel</b>: reminder appuntamenti (08:00 UTC) e retention dati (04:00 UTC) configurati in <font face='Courier' size='9'>vercel.json</font>.",
    "<b>Dev bypass</b> (<font face='Courier' size='9'>NEXT_PUBLIC_DEV_BYPASS</font>) per impersonare ruoli in locale via query param - mai abilitato in produzione.",
]))

story.append(PageBreak())

# 4. Modello dati
story.append(section_header("4. Modello dati (Prisma)"))
story.append(Paragraph(
    "Schema PostgreSQL pensato per relazione N-a-N paziente / professionista, con stati espliciti "
    "per i percorsi di cura e tracciamento completo degli eventi.",
    body_style,
))

story.append(kv_table([
    ["Identita'", "<b>User</b>, <b>Organization</b> (multi-tenant white-label)"],
    ["Cura", "<b>CareRelationship</b> (paziente - medico / coach, stato: ACTIVE / PAUSED / ARCHIVED)"],
    ["Agenda", "<b>Appointment</b> (IN_PERSON | VIDEO_CALL), <b>AvailabilitySlot</b>, <b>AppointmentReminder</b>"],
    ["Salute", "<b>BiometricLog</b>, <b>SymptomLog</b>, <b>CheckIn</b>, <b>MetricTarget</b>"],
    ["Terapia", "<b>TherapyItem</b> (PRESCRIBED | SELF), <b>NutritionPlan</b>, <b>MealEntry</b>"],
    ["Referti", "<b>MedicalReport</b> con 8 categorie (BLOOD_TEST, IMAGING, CARDIOLOGY, ...)"],
    ["Messaging", "<b>Conversation</b>, <b>ConversationMember</b>, <b>Message</b>"],
    ["Billing", "<b>Subscription</b>, <b>Invoice</b> (sincronizzate via webhook Stripe)"],
    ["Audit", "<b>AuditLog</b> (actor, action, entity, metadata, IP, UA, timestamp)"],
    ["Notifiche", "<b>Notification</b> (REMINDER / CHECK_IN / PAYMENT / SYSTEM / AI)"],
]))

# 5. Ruoli & moduli
story.append(section_header("5. Ruoli e moduli funzionali"))

story.append(Paragraph("<b>Paziente</b> - /dashboard/patient", h2_style))
story.append(bullets([
    "Overview salute, tracking biometrico (peso, parametri vitali).",
    "Calendario appuntamenti, messaggistica con il Team di Ferro.",
    "Aderenza terapia, diario nutrizionale, check-in periodici.",
]))

story.append(Paragraph("<b>Medico</b> - /dashboard/doctor", h2_style))
story.append(bullets([
    "Lista pazienti + scheda clinica.",
    "Upload referti medici (multi-categoria) e prescrizione terapie.",
    "Gestione disponibilita' / slot agenda.",
]))

story.append(Paragraph("<b>Coach</b> - /dashboard/coach", h2_style))
story.append(bullets([
    "Gestione clienti, intake terapeutico, piani nutrizionali.",
    "Review check-in (stato PENDING / REVIEWED), target metrici.",
]))

story.append(Paragraph("<b>Admin</b> - /dashboard/admin", h2_style))
story.append(bullets([
    "Health check di sistema (Sentry + DB + servizi esterni).",
    "Toggle feature flag (Redis-backed, es. ENFORCE_2FA).",
    "Broadcast e provisioning staff.",
]))

story.append(PageBreak())

# 6. Sicurezza & Compliance
story.append(section_header("6. Sicurezza e compliance"))

story.append(Paragraph("2FA obbligatoria sui ruoli clinici", h2_style))
story.append(Paragraph(
    "Hard gate AAL2 (Supabase) per DOCTOR, COACH e ADMIN. Rollout progressivo via feature flag su "
    "Redis con fallback su variabile d'ambiente. Sono previste solo escape route esplicite "
    "(<font face='Courier' size='9'>/dashboard/settings/security</font>, "
    "<font face='Courier' size='9'>/auth</font>, "
    "<font face='Courier' size='9'>/api</font>) per evitare lockout durante setup.",
    body_style,
))

story.append(Paragraph("Audit log (GDPR Art. 30)", h2_style))
story.append(Paragraph(
    "La tabella <b>AuditLog</b> registra attore, azione (enum tipizzata), entita' coinvolta, "
    "metadata in JSON, IP e user-agent. La scrittura e' best-effort: un fallimento di logging non "
    "blocca la request, ma viene tracciato in Sentry. Pronto per i registri delle attivita' di "
    "trattamento richiesti dal GDPR.",
    body_style,
))

story.append(Paragraph("Rate limiting distribuito", h2_style))
story.append(Paragraph(
    "Implementazione sliding-window su Upstash Redis (HTTP-based, compatibile con runtime serverless "
    "Vercel). Per il dev locale c'e' un fallback in-memory con Map.",
    body_style,
))

story.append(Paragraph("Error tracking & health", h2_style))
story.append(bullets([
    "Sentry SDK lato server e client (source map upload via auth token).",
    "Endpoint <font face='Courier' size='9'>/api/admin/health</font> testa connessione DB, Sentry, servizi esterni.",
]))

story.append(Paragraph("Sicurezza DB", h2_style))
story.append(bullets([
    "Multi-schema PostgreSQL (<font face='Courier' size='9'>public</font> + <font face='Courier' size='9'>auth</font>) con foreign key verso <font face='Courier' size='9'>auth.users</font> Supabase.",
    "Adapter Prisma su <font face='Courier' size='9'>pg</font> ufficiale - connessione pooled.",
    "RLS (Row Level Security) gestita lato Supabase per le tabelle critiche.",
]))

# 7. DevOps
story.append(section_header("7. DevOps & deploy"))

story.append(Paragraph("Hosting", h2_style))
story.append(Paragraph(
    "Deploy su Vercel (configurazione <font face='Courier' size='9'>vercel.json</font>). "
    "Database PostgreSQL e Auth su Supabase. Redis su Upstash. Email via Resend. "
    "Pagamenti via Stripe.",
    body_style,
))

story.append(Paragraph("Build pipeline", h2_style))
story.append(Paragraph(
    "<font face='Courier' size='9'>npm run build</font> -&gt; "
    "<font face='Courier' size='9'>prisma migrate deploy</font> -&gt; "
    "<font face='Courier' size='9'>prisma generate</font> -&gt; "
    "<font face='Courier' size='9'>next build</font>",
    code_style,
))

story.append(Paragraph("Cron job (Vercel)", h2_style))
story.append(bullets([
    "<font face='Courier' size='9'>/api/cron/appointment-reminders</font> - ogni giorno 08:00 UTC.",
    "<font face='Courier' size='9'>/api/cron/retention</font> - ogni giorno 04:00 UTC.",
]))

story.append(Paragraph("Variabili d'ambiente principali", h2_style))
story.append(bullets([
    "<font face='Courier' size='9'>SUPABASE_URL</font>, <font face='Courier' size='9'>SUPABASE_ANON_KEY</font>, <font face='Courier' size='9'>SUPABASE_SERVICE_ROLE_KEY</font>",
    "<font face='Courier' size='9'>STRIPE_SECRET_KEY</font>, <font face='Courier' size='9'>STRIPE_PUBLISHABLE_KEY</font>, <font face='Courier' size='9'>STRIPE_WEBHOOK_SECRET</font>",
    "<font face='Courier' size='9'>UPSTASH_REDIS_REST_URL</font>, <font face='Courier' size='9'>UPSTASH_REDIS_REST_TOKEN</font>",
    "<font face='Courier' size='9'>SENTRY_AUTH_TOKEN</font>, <font face='Courier' size='9'>NEXT_PUBLIC_SENTRY_DSN</font>",
    "<font face='Courier' size='9'>RESEND_API_KEY</font>, <font face='Courier' size='9'>OPENAI_API_KEY</font>",
]))

story.append(Paragraph("Workflow di team", h2_style))
story.append(bullets([
    "Mai lavorare direttamente su <b>main</b>. Branch obbligatori: <font face='Courier' size='9'>feat/</font>, <font face='Courier' size='9'>fix/</font>, <font face='Courier' size='9'>chore/</font>, <font face='Courier' size='9'>refactor/</font>, <font face='Courier' size='9'>docs/</font>.",
    "Conventional Commits con scope (<font face='Courier' size='9'>auth</font>, <font face='Courier' size='9'>patient</font>, <font face='Courier' size='9'>doctor</font>, ...).",
    "PR piccole (1-2 giorni di lavoro), auto-merge su CI verde, review post-merge asincrona.",
]))

# 8. Roadmap
story.append(section_header("8. Stato e roadmap"))
story.append(kv_table([
    ["Stato attuale", "Dashboard web operativa con i 4 ruoli, billing Stripe, audit GDPR, 2FA in rollout"],
    ["Companion mobile", "App Expo / React Native (<b>sdf-mobile</b>) in sviluppo parallelo"],
    ["Consegna", "fine maggio 2026 - priorita' assoluta alla stabilita' di <b>main</b>"],
]))

story.append(Spacer(1, 14))
story.append(Paragraph(
    "Documento generato in modo automatico a partire dallo stato corrente del repository. "
    "Per dettagli aggiornati su routing, comandi e convenzioni vedere i file "
    "<font face='Courier' size='9'>CLAUDE.md</font> e <font face='Courier' size='9'>AGENTS.md</font> "
    "nella root del progetto.",
    small_style,
))


doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"PDF scritto in: {OUTPUT}")
