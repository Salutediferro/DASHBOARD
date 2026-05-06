"use client";

import * as React from "react";
import { CheckCircle2, Loader2, SlidersHorizontal } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useUser } from "@/lib/hooks/use-user";
import {
  OVERVIEW_DEFAULT,
  OVERVIEW_METRIC_KEYS,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";
import { MetricSelector } from "./metric-selector";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Shared dialog version of `MetricPreferencesCard` — same MetricSelector,
 * same PATCH /api/me persistence, same React Query invalidation, but
 * surfaced from anywhere instead of forcing a navigation to the profile
 * page. Triggers live on the dashboard hero, the health page ring row,
 * the empty-state CTA, and the add-rilevazione dialog footer.
 */
export function MetricPreferencesDialog({ open, onOpenChange }: Props) {
  const { profile } = useUser();
  const queryClient = useQueryClient();
  const [pending, setPending] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<number | null>(null);

  const initial = React.useMemo<OverviewMetricKey[]>(() => {
    const valid = OVERVIEW_METRIC_KEYS as readonly string[];
    const fromServer = (profile?.selectedMetrics ?? []).filter(
      (k): k is OverviewMetricKey => valid.includes(k),
    );
    return fromServer.length > 0 ? fromServer : [...OVERVIEW_DEFAULT];
  }, [profile?.selectedMetrics]);

  const [selected, setSelected] = React.useState<OverviewMetricKey[]>(initial);
  const lastSeen = React.useRef<string>(JSON.stringify(initial));

  React.useEffect(() => {
    const k = JSON.stringify(initial);
    if (lastSeen.current === k) return;
    lastSeen.current = k;
    setSelected(initial);
  }, [initial]);

  // Reset the "Salvato" pill when the dialog opens, so the previous
  // session's confirmation doesn't linger on a fresh edit.
  React.useEffect(() => {
    if (open) setSavedAt(null);
  }, [open]);

  const persist = React.useCallback(
    async (next: OverviewMetricKey[]) => {
      setPending(true);
      try {
        const res = await fetch("/api/me", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ selectedMetrics: next }),
        });
        if (!res.ok) throw new Error();
        queryClient.invalidateQueries({ queryKey: ["profile"] });
        setSavedAt(Date.now());
      } catch {
        toast.error("Errore nel salvataggio");
      } finally {
        setPending(false);
      }
    },
    [queryClient],
  );

  const onToggle = React.useCallback(
    (key: OverviewMetricKey) => {
      setSelected((prev) => {
        let next: OverviewMetricKey[];
        if (prev.includes(key)) {
          next = prev.filter((k) => k !== key);
        } else {
          next = [...prev, key];
        }
        void persist(next);
        return next;
      });
    },
    [persist],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden />
            Metriche da monitorare
          </DialogTitle>
          <DialogDescription>
            Selezionate {selected.length} metriche. Filtreranno la dashboard,
            la pagina Dati salute e il modulo di rilevazione.
          </DialogDescription>
        </DialogHeader>
        <div className="text-muted-foreground -mt-1 inline-flex items-center gap-1.5 text-xs">
          {pending ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
              Salvataggio…
            </>
          ) : savedAt != null ? (
            <>
              <CheckCircle2 className="text-emerald-500 h-3 w-3" aria-hidden />
              Salvato
            </>
          ) : null}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          <MetricSelector
            selected={selected}
            onToggle={onToggle}
            minSelected={0}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
