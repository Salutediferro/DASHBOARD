"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Info, Siren, X } from "lucide-react";

import { cn } from "@/lib/utils";

type BroadcastSeverity = "info" | "warning" | "critical";

type Broadcast = {
  message: string;
  severity: BroadcastSeverity;
  expiresAt: string | null;
  activatedBy: { id: string; fullName: string };
  activatedAt: string;
};

type Response = { broadcast: Broadcast | null };

const SEVERITY_META: Record<
  BroadcastSeverity,
  { wrap: string; icon: React.ElementType }
> = {
  info: {
    wrap: "bg-sky-500/10 text-sky-900 dark:text-sky-100 border-sky-500/30",
    icon: Info,
  },
  warning: {
    wrap: "bg-amber-500/15 text-amber-900 dark:text-amber-100 border-amber-500/40",
    icon: AlertTriangle,
  },
  critical: {
    wrap: "bg-red-500/15 text-red-900 dark:text-red-100 border-red-500/40",
    icon: Siren,
  },
};

// LocalStorage key used to suppress a dismissed banner for the rest of
// the session. Tied to the `activatedAt` so that a re-published banner
// with the same message becomes visible again.
const DISMISS_KEY = "sdf:broadcast:dismissed";

/**
 * Polls `/api/broadcast` every 60s and renders the active message above
 * the dashboard chrome. Renders null when there is no broadcast, so the
 * UI collapses to zero height — no visual jitter when it's idle.
 *
 * Dismissible: a user can X-close a banner and it stays hidden until a
 * new broadcast is published (different `activatedAt`). Critical-severity
 * banners do NOT offer the close button — maintenance messages should
 * not be dismissable for the whole session.
 */
export function BroadcastBanner() {
  const { data } = useQuery<Response>({
    queryKey: ["broadcast"],
    queryFn: async () => {
      const res = await fetch("/api/broadcast", { cache: "no-store" });
      if (!res.ok) return { broadcast: null };
      return res.json();
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Read dismissed state from localStorage via useSyncExternalStore —
  // that way we (a) don't need a useState+useEffect dance and (b) the
  // SSR snapshot returns null so the banner always renders server-side,
  // avoiding hydration mismatches on the dismissable variants.
  const subscribe = React.useCallback((cb: () => void) => {
    if (typeof window === "undefined") return () => undefined;
    window.addEventListener("storage", cb);
    return () => window.removeEventListener("storage", cb);
  }, []);
  const dismissedAt = React.useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(DISMISS_KEY);
      } catch {
        return null;
      }
    },
    () => null,
  );

  const broadcast = data?.broadcast ?? null;
  if (!broadcast) return null;
  if (
    broadcast.severity !== "critical" &&
    dismissedAt === broadcast.activatedAt
  ) {
    return null;
  }

  const meta = SEVERITY_META[broadcast.severity];
  const Icon = meta.icon;
  const canDismiss = broadcast.severity !== "critical";

  function onDismiss() {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DISMISS_KEY, broadcast!.activatedAt);
      // `storage` events only fire on OTHER tabs, so dispatch a synthetic
      // event in this tab to wake up useSyncExternalStore's subscriber.
      window.dispatchEvent(new Event("storage"));
    } catch {
      /* no-op */
    }
  }

  return (
    <div
      role={broadcast.severity === "critical" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 border-b px-4 py-3 text-sm md:px-6",
        meta.wrap,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1 leading-relaxed">{broadcast.message}</p>
      {canDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="hover:bg-black/5 dark:hover:bg-white/5 rounded p-1"
          aria-label="Chiudi banner"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
