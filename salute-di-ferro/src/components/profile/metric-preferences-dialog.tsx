"use client";

import * as React from "react";
import { CheckCircle2, Loader2, SlidersHorizontal } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useOverviewPrefs } from "@/lib/hooks/use-overview-prefs";
import { MetricSelector } from "./metric-selector";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Shared dialog version of `MetricPreferencesCard` — same MetricSelector,
 * same persistence, surfaced from anywhere instead of forcing a
 * navigation to the profile page. Triggers live on the dashboard hero,
 * the health page ring row, the empty-state CTA, and the add-rilevazione
 * dialog footer.
 *
 * State + server sync go through the shared `useOverviewPrefs` hook so
 * the dialog, the profile card, and the dashboard cards never disagree
 * about which metrics are tracked.
 */
export function MetricPreferencesDialog({ open, onOpenChange }: Props) {
  const { selected, toggle, pending, savedAt, clearSavedAt } =
    useOverviewPrefs();

  // Reset the "Salvato" pill when the dialog opens, so the previous
  // session's confirmation doesn't linger on a fresh edit.
  React.useEffect(() => {
    if (open) clearSavedAt();
  }, [open, clearSavedAt]);

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
          <MetricSelector selected={selected} onToggle={toggle} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
