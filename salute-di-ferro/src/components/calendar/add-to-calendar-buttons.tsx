"use client";

import * as React from "react";
import { CalendarPlus } from "lucide-react";

import {
  appointmentToCalendarEvent,
  googleCalendarUrl,
  outlookCalendarUrl,
} from "@/lib/calendar/external-links";
import type { AppointmentDTO } from "@/lib/hooks/use-appointments";

type Props = {
  appointment: AppointmentDTO;
  /** Compact icon-only mode for use inside dense list rows. */
  compact?: boolean;
};

/**
 * "Add to calendar" affordance with three targets:
 *   - Google Calendar  → opens calendar.google.com with the event prefilled
 *   - Outlook Web      → opens outlook.live.com compose
 *   - .ics download    → falls back to the existing per-appointment route
 *
 * Wrapping clicks with stopPropagation so the buttons can live inside
 * other clickable rows without triggering the row handler.
 */
export function AddToCalendarButtons({ appointment, compact }: Props) {
  const event = React.useMemo(
    () => appointmentToCalendarEvent(appointment),
    [appointment],
  );
  const gcal = googleCalendarUrl(event);
  const outlook = outlookCalendarUrl(event);
  const ics = `/api/appointments/${appointment.id}/ics`;

  const stop = (e: React.MouseEvent) => e.stopPropagation();

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1"
        onClick={stop}
        role="group"
        aria-label="Aggiungi al calendario"
      >
        <CompactLink href={gcal} title="Google Calendar" label="G" external />
        <CompactLink href={outlook} title="Outlook" label="O" external />
        <CompactLink href={ics} title="Scarica .ics" label=".ics" download />
      </span>
    );
  }

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      onClick={stop}
      role="group"
      aria-label="Aggiungi al calendario"
    >
      <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
        <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
        Aggiungi al calendario:
      </span>
      <FullLink href={gcal} external>
        Google
      </FullLink>
      <FullLink href={outlook} external>
        Outlook
      </FullLink>
      <FullLink href={ics} download>
        .ics
      </FullLink>
    </div>
  );
}

function CompactLink({
  href,
  title,
  label,
  external,
  download,
}: {
  href: string;
  title: string;
  label: string;
  external?: boolean;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      title={title}
      aria-label={title}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      {...(download ? { download: true } : {})}
      className="focus-ring inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-border/60 px-1.5 text-[10px] font-semibold uppercase text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {label}
    </a>
  );
}

function FullLink({
  href,
  children,
  external,
  download,
}: {
  href: string;
  children: React.ReactNode;
  external?: boolean;
  download?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
      {...(download ? { download: true } : {})}
      className="focus-ring inline-flex h-8 items-center gap-1 rounded-md border border-border/60 bg-card px-2.5 text-xs font-medium transition-colors hover:bg-muted"
    >
      {children}
    </a>
  );
}
