"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react";

/**
 * Brand-configured global Toaster.
 *
 *  - richColors: semantic tones (success green, error red) inherit from
 *    --primary/--destructive so they track the pivot automatically.
 *  - closeButton: always on — screen-reader friendly + dismissable.
 *  - Position: top-right on desktop, top-center on mobile (auto-swap
 *    via a tiny matchMedia hook — Sonner itself doesn't do responsive).
 *  - Durations: info 4.5s · success 6s · error 8s.
 *  - Chrome: surface-2 + primary-red border at ~30% via CSS vars below.
 */
const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  const [position, setPosition] = React.useState<ToasterProps["position"]>(
    "top-right",
  );

  React.useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(max-width: 639px)");
    const apply = () => setPosition(mq.matches ? "top-center" : "top-right");
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position={position}
      richColors
      closeButton
      duration={4500}
      toastOptions={{
        duration: 4500,
        classNames: {
          toast:
            "!bg-[var(--surface-2-bg)] !border !border-[var(--toast-border)] !text-foreground !shadow-lg !rounded-xl",
          success:
            "!bg-[var(--surface-2-bg)] !text-success !border-success/40",
          error:
            "!bg-[var(--surface-2-bg)] !text-destructive !border-destructive/40",
          info: "!bg-[var(--surface-2-bg)] !text-info !border-info/40",
          warning:
            "!bg-[var(--surface-2-bg)] !text-warning !border-warning/40",
          closeButton:
            "!bg-muted !text-muted-foreground hover:!text-foreground !border-border/60",
        },
      }}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
          "--surface-2-bg": "var(--card)",
          "--toast-border":
            "color-mix(in oklab, var(--primary-500) 30%, var(--border))",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };

/**
 * Default durations by semantic tone. Use these when calling
 * `toast.*` with custom options to keep timing consistent across the
 * app.
 */
export const TOAST_DURATION = {
  info: 4500,
  success: 6000,
  error: 8000,
} as const;
