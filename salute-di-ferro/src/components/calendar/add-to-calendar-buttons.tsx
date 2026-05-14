"use client";

import * as React from "react";
import Image from "next/image";

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
          <BrandIcon src={GOOGLE_ICON} alt="Google Calendar" size={32} />
        </IconButton>
        <IconButton href={outlook} title="Aggiungi a Outlook" tone="outlook">
          <BrandIcon src={OUTLOOK_ICON} alt="Outlook" size={32} />
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
        <BrandIcon src={GOOGLE_ICON} alt="" size={20} />
        Google Calendar
      </FullButton>
      <FullButton href={outlook} tone="outlook">
        <BrandIcon src={OUTLOOK_ICON} alt="" size={20} />
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
// Official brand marks served as static files from /public/icons. We
// don't inline the SVGs because the Outlook artwork uses ~10 gradient
// defs with global ids (linear0, radial1, …) — inlining the same SVG
// multiple times on the page would collide id refs across instances
// and break the rendering. Files also let the browser cache them
// after the first paint.
//
// Served through next/image with `unoptimized` because the Next image
// optimizer refuses SVGs unless `dangerouslyAllowSVG: true` is set
// globally in next.config (risky if user uploads are ever piped
// through the same loader). `unoptimized` bypasses the loader for
// these two icons only; everything else still benefits from
// optimization. See node_modules/next/dist/docs/01-app/03-api-reference
// /02-components/image.md §unoptimized.
// ─────────────────────────────────────────────────────────────────────

const GOOGLE_ICON = "/icons/google-calendar.svg";
const OUTLOOK_ICON = "/icons/outlook.svg";

function BrandIcon({
  src,
  alt,
  size,
}: {
  src: string;
  alt: string;
  /** Pixel size — used for both width and height. Both icons are
   *  intentionally rendered in a square box; the Outlook viewBox is
   *  near-square (≈1.05:1), so the SVG's preserveAspectRatio adds an
   *  imperceptible ~1px letterbox that uniforms the button column. */
  size: number;
}) {
  return (
    <Image
      src={src}
      alt={alt}
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className={cn("select-none")}
      aria-hidden={alt === "" ? true : undefined}
    />
  );
}
