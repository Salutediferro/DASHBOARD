"use client";

import * as React from "react";

import {
  appointmentToCalendarEvent,
  googleCalendarUrl,
  outlookCalendarUrl,
} from "@/lib/calendar/external-links";
import type { AppointmentDTO } from "@/lib/hooks/use-appointments";
import { cn } from "@/lib/utils";

type Props = {
  appointment: AppointmentDTO;
  /**
   * Visual prominence:
   *   - "compact": large icon-only square buttons (used inline in dense
   *     appointment rows). The notification CTA lands the user here, so
   *     these are intentionally hard to miss.
   *   - "full": icon + text label (used inside the appointment detail
   *     dialog, where there's room for prose).
   */
  variant?: "compact" | "full";
};

/**
 * "Aggiungi al calendario" affordance. Two targets:
 *   - Google Calendar  → opens calendar.google.com with the event prefilled
 *   - Outlook Web      → opens outlook.live.com compose
 *
 * The .ics download path used to live here too. It was removed once the
 * subscription feed shipped — `.ics` was confusing for users who didn't
 * recognize the extension, and the Google/Outlook deep links cover both
 * web-based calendars without making anyone download a file.
 */
export function AddToCalendarButtons({ appointment, variant = "full" }: Props) {
  const event = React.useMemo(
    () => appointmentToCalendarEvent(appointment),
    [appointment],
  );
  const gcal = googleCalendarUrl(event);
  const outlook = outlookCalendarUrl(event);

  // Keep these clickable inside other clickable rows.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (variant === "compact") {
    return (
      <span
        className="inline-flex items-center gap-2"
        onClick={stop}
        role="group"
        aria-label="Aggiungi al calendario"
      >
        <IconButton
          href={gcal}
          title="Aggiungi a Google Calendar"
          tone="google"
        >
          <GoogleCalendarLogo className="h-8 w-8" />
        </IconButton>
        <IconButton
          href={outlook}
          title="Aggiungi a Outlook"
          tone="outlook"
        >
          <OutlookLogo className="h-8 w-8" />
        </IconButton>
      </span>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      onClick={stop}
      role="group"
      aria-label="Aggiungi al calendario"
    >
      <FullButton href={gcal} tone="google">
        <GoogleCalendarLogo className="h-5 w-5" />
        Google Calendar
      </FullButton>
      <FullButton href={outlook} tone="outlook">
        <OutlookLogo className="h-5 w-5" />
        Outlook
      </FullButton>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Building blocks
// ─────────────────────────────────────────────────────────────────────

type Tone = "google" | "outlook";

const TONE_RING: Record<Tone, string> = {
  // Tinted ring + hover background so the buttons read as branded CTAs
  // without going full color (which would look loud inside a row).
  google: "ring-[#1a73e8]/40 hover:bg-[#1a73e8]/5",
  outlook: "ring-[#0078d4]/40 hover:bg-[#0078d4]/5",
};

function IconButton({
  href,
  title,
  tone,
  children,
}: {
  href: string;
  title: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      title={title}
      aria-label={title}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "focus-ring inline-flex h-12 w-12 items-center justify-center rounded-xl",
        "bg-card ring-1 transition-all hover:scale-[1.04] active:scale-95",
        TONE_RING[tone],
      )}
    >
      {children}
    </a>
  );
}

function FullButton({
  href,
  tone,
  children,
}: {
  href: string;
  tone: Tone;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        "focus-ring inline-flex h-9 items-center gap-2 rounded-md bg-card px-3 text-sm font-medium",
        "ring-1 transition-colors",
        TONE_RING[tone],
      )}
    >
      {children}
    </a>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Inline brand SVGs — kept here so a missing CDN/icon-pack can't break
// the most visible CTA in the patient flow.
// ─────────────────────────────────────────────────────────────────────

function GoogleCalendarLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Card body */}
      <rect
        x="8"
        y="10"
        width="32"
        height="32"
        rx="3"
        fill="#fff"
        stroke="#dadce0"
        strokeWidth="1"
      />
      {/* Top blue strip */}
      <path d="M8 13a3 3 0 013-3h26a3 3 0 013 3v3H8v-3z" fill="#1a73e8" />
      {/* Binder rings */}
      <rect x="13" y="6" width="3" height="10" rx="1.5" fill="#185abc" />
      <rect x="32" y="6" width="3" height="10" rx="1.5" fill="#185abc" />
      {/* "31" date */}
      <text
        x="24"
        y="35"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontSize="13"
        fontWeight="700"
        fill="#1a73e8"
      >
        31
      </text>
    </svg>
  );
}

function OutlookLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Blue background */}
      <rect x="4" y="4" width="40" height="40" rx="6" fill="#0078d4" />
      {/* Stylised "O" — two concentric rings + white inner */}
      <ellipse cx="22" cy="24" rx="10" ry="11" fill="#fff" />
      <ellipse cx="22" cy="24" rx="5" ry="6" fill="#0078d4" />
      {/* Right-side accent stripe suggesting the calendar fold */}
      <rect x="34" y="10" width="6" height="28" rx="1" fill="#50d9ff" />
    </svg>
  );
}
