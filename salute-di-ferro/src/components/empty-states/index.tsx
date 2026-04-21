import type { ReactNode } from "react";

/**
 * Section-specific empty states with minimal inline SVG illustrations.
 * Each illustration uses the brand chrome→red gradient ring on a small
 * scale so they feel part of one family.
 */

// ── Shared wrapper ───────────────────────────────────────────────

function EmptyFrame({
  illustration,
  title,
  description,
  action,
}: {
  illustration: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-primary-500/15 bg-card/40 px-6 py-10 text-center">
      {illustration}
      <div className="flex max-w-sm flex-col gap-1.5">
        <h3 className="text-display text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function GradientRing({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#c0c0c0" />
        <stop offset="55%" stopColor="#8a8a8a" />
        <stop offset="100%" stopColor="#b22222" />
      </linearGradient>
    </defs>
  );
}

// ── Biometrics ───────────────────────────────────────────────────

export function BiometricsEmptyState({ action }: { action?: ReactNode }) {
  return (
    <EmptyFrame
      title="Registra la tua prima rilevazione"
      description="Peso, misure, sonno: inizia a raccogliere i dati che costruiranno il tuo percorso nel tempo."
      illustration={
        <svg
          role="img"
          aria-labelledby="bio-empty-t bio-empty-d"
          viewBox="0 0 160 140"
          className="h-24 w-28"
        >
          <title id="bio-empty-t">Bilancia con ruota di progresso</title>
          <desc id="bio-empty-d">
            Una bilancia stilizzata al centro di un cerchio metallico con
            accento rosso.
          </desc>
          <GradientRing id="bio-ring" />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
            opacity="0.5"
          />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="url(#bio-ring)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="220 314"
            transform="rotate(-90 80 70)"
          />
          <rect
            x="56"
            y="60"
            width="48"
            height="30"
            rx="5"
            fill="var(--card)"
            stroke="var(--accent-500)"
            strokeOpacity="0.35"
          />
          <rect
            x="64"
            y="68"
            width="32"
            height="12"
            rx="2"
            fill="var(--background)"
          />
          <circle cx="72" cy="74" r="1.5" fill="#b22222" />
          <circle cx="80" cy="74" r="1.5" fill="var(--accent-500)" opacity="0.7" />
          <circle cx="88" cy="74" r="1.5" fill="var(--accent-500)" opacity="0.5" />
          <rect x="60" y="90" width="6" height="4" fill="var(--accent-500)" opacity="0.5" />
          <rect x="94" y="90" width="6" height="4" fill="var(--accent-500)" opacity="0.5" />
        </svg>
      }
      action={action}
    />
  );
}

// ── Medical reports ──────────────────────────────────────────────

export function ReportsEmptyState({ action }: { action?: ReactNode }) {
  return (
    <EmptyFrame
      title="Carica il primo referto"
      description="Visite, analisi, esami strumentali: tutto in un posto solo, cifrato. Solo tu decidi chi può vederli."
      illustration={
        <svg
          role="img"
          aria-labelledby="rep-empty-t rep-empty-d"
          viewBox="0 0 160 140"
          className="h-24 w-28"
        >
          <title id="rep-empty-t">Cartella del cliente con anello cromato</title>
          <desc id="rep-empty-d">
            Una cartella stilizzata con documento all&apos;interno, circondata
            da un anello cromato.
          </desc>
          <GradientRing id="rep-ring" />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
            opacity="0.5"
          />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="url(#rep-ring)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="200 314"
            transform="rotate(-90 80 70)"
          />
          {/* Folder tab */}
          <rect
            x="54"
            y="52"
            width="28"
            height="6"
            rx="1.5"
            fill="var(--accent-500)"
            opacity="0.6"
          />
          {/* Folder body */}
          <rect
            x="54"
            y="58"
            width="52"
            height="36"
            rx="3"
            fill="var(--card)"
            stroke="var(--accent-500)"
            strokeOpacity="0.4"
          />
          {/* Document inside */}
          <rect
            x="60"
            y="64"
            width="40"
            height="24"
            rx="2"
            fill="var(--background)"
            stroke="var(--accent-500)"
            strokeOpacity="0.25"
          />
          <rect x="64" y="68" width="22" height="2" rx="1" fill="var(--accent-500)" opacity="0.8" />
          <rect x="64" y="73" width="32" height="1.5" rx="0.8" fill="var(--accent-500)" opacity="0.4" />
          <rect x="64" y="77" width="32" height="1.5" rx="0.8" fill="var(--accent-500)" opacity="0.4" />
          <rect x="64" y="81" width="20" height="1.5" rx="0.8" fill="var(--accent-500)" opacity="0.4" />
          {/* Medical cross accent */}
          <path
            d="M 92 70 h 4 v 4 h 4 v 4 h -4 v 4 h -4 v -4 h -4 v -4 h 4 z"
            fill="#b22222"
            opacity="0.85"
          />
        </svg>
      }
      action={action}
    />
  );
}

// ── Appointments ─────────────────────────────────────────────────

export function AppointmentsEmptyState({ action }: { action?: ReactNode }) {
  return (
    <EmptyFrame
      title="Nessun appuntamento in programma"
      description="Prenota il prossimo incontro con medico o coach in pochi passaggi."
      illustration={
        <svg
          role="img"
          aria-labelledby="apt-empty-t apt-empty-d"
          viewBox="0 0 160 140"
          className="h-24 w-28"
        >
          <title id="apt-empty-t">Calendario con anello cromato</title>
          <desc id="apt-empty-d">
            Un calendario stilizzato con un giorno evidenziato, al centro di
            un anello cromato.
          </desc>
          <GradientRing id="apt-ring" />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
            opacity="0.5"
          />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="url(#apt-ring)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="240 314"
            transform="rotate(-90 80 70)"
          />
          {/* Calendar binding rings */}
          <rect x="62" y="46" width="3" height="8" rx="1.5" fill="var(--accent-500)" opacity="0.7" />
          <rect x="95" y="46" width="3" height="8" rx="1.5" fill="var(--accent-500)" opacity="0.7" />
          {/* Calendar body */}
          <rect
            x="54"
            y="52"
            width="52"
            height="44"
            rx="4"
            fill="var(--card)"
            stroke="var(--accent-500)"
            strokeOpacity="0.35"
          />
          {/* Header */}
          <rect x="54" y="52" width="52" height="9" rx="4" fill="var(--accent-500)" opacity="0.15" />
          {/* Grid dots */}
          {[0, 1, 2, 3].map((col) =>
            [0, 1, 2].map((row) => (
              <circle
                key={`${col}-${row}`}
                cx={62 + col * 12}
                cy={70 + row * 8}
                r="1.3"
                fill="var(--accent-500)"
                opacity="0.45"
              />
            )),
          )}
          {/* Selected day */}
          <circle cx="74" cy="78" r="4" fill="#b22222" />
          <circle cx="74" cy="78" r="1.3" fill="var(--primary-foreground)" />
        </svg>
      }
      action={action}
    />
  );
}

// ── Messages ─────────────────────────────────────────────────────

export function MessagesEmptyState({ action }: { action?: ReactNode }) {
  return (
    <EmptyFrame
      title="Scrivi al tuo coach"
      description="Una chat diretta col tuo team: fai domande, aggiorna sul progresso, ricevi feedback."
      illustration={
        <svg
          role="img"
          aria-labelledby="msg-empty-t msg-empty-d"
          viewBox="0 0 160 140"
          className="h-24 w-28"
        >
          <title id="msg-empty-t">Nuvoletta di conversazione</title>
          <desc id="msg-empty-d">
            Una bubble con tre punti al centro di un anello cromato.
          </desc>
          <GradientRing id="msg-ring" />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="var(--muted)"
            strokeWidth="8"
            opacity="0.5"
          />
          <circle
            cx="80"
            cy="70"
            r="50"
            fill="none"
            stroke="url(#msg-ring)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="210 314"
            transform="rotate(-90 80 70)"
          />
          <path
            d="M 56 54 h 48 a 8 8 0 0 1 8 8 v 20 a 8 8 0 0 1 -8 8 h -24 l -10 10 v -10 h -14 a 8 8 0 0 1 -8 -8 v -20 a 8 8 0 0 1 8 -8 z"
            fill="var(--card)"
            stroke="var(--accent-500)"
            strokeOpacity="0.4"
          />
          <circle cx="72" cy="72" r="2" fill="var(--accent-500)" opacity="0.8" />
          <circle cx="80" cy="72" r="2" fill="#b22222" />
          <circle cx="88" cy="72" r="2" fill="var(--accent-500)" opacity="0.8" />
        </svg>
      }
      action={action}
    />
  );
}
