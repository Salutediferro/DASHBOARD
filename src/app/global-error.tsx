"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

import { ErrorSurface } from "./error";
import "./globals.css";

/**
 * Last-resort error boundary: catches failures in the root layout
 * itself (metadata loading, providers, etc.). Needs its own <html>
 * and <body> because it renders *instead of* the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      Sentry.captureException(error);
    } else {
      console.error("[Global error boundary]", error);
    }
  }, [error]);

  return (
    <html lang="it" className="dark h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <ErrorSurface error={error} reset={reset} />
      </body>
    </html>
  );
}
