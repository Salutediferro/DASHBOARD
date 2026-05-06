"use client";

import * as React from "react";

import { MetricPreferencesDialog } from "./metric-preferences-dialog";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * Drop-in replacement for the old "vai al profilo per modificare le
 * metriche" links. Renders a button styled exactly like the caller asks
 * (className/children pass through) and mounts a shared
 * MetricPreferencesDialog instead of navigating away.
 */
export function EditMetricsButton({ children, onClick, ...rest }: Props) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          onClick?.(e);
          if (!e.defaultPrevented) setOpen(true);
        }}
        {...rest}
      >
        {children}
      </button>
      <MetricPreferencesDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
