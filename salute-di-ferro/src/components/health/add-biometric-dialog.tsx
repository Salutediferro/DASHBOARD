"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, SlidersHorizontal } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  FIELD_TO_OVERVIEW_KEY,
  type OverviewMetricKey,
} from "@/lib/overview-metric-keys";
import { useOverviewPrefs } from "@/lib/hooks/use-overview-prefs";
import { CATEGORIES, FIELDS, type CategoryKey } from "./metric-fields";
import { MetricForm, type MetricField } from "./metric-form";

type Props = {
  /** Server-rendered selectedMetrics — same shape as elsewhere. The
   * dialog filters categories and fields against this list. */
  initialSelectedMetrics?: readonly string[];
  /** Optional className override on the trigger button — useful when
   * the parent wants a different size (compact toolbar vs hero CTA). */
  triggerClassName?: string;
  /** Override the default "Aggiungi rilevazione" label. */
  triggerLabel?: string;
  /** Accessible name for the trigger. Required when `triggerLabel` is
   * empty (icon-only) — without it, screen readers announce nothing.
   * Defaults to the visible label. */
  triggerAriaLabel?: string;
  /** Hide the built-in red trigger entirely. Use when the parent
   * supplies its own trigger via `open` (controlled mode). */
  hideTrigger?: boolean;
  /** Controlled open state — parent supplies both, dialog renders as
   * a controlled component. Leave undefined for self-managed mode. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Controlled active category. When provided, the parent decides
   * which category is selected — useful for "open the dialog on the
   * cardiovascular tab" flows. */
  category?: CategoryKey;
  onCategoryChange?: (c: CategoryKey) => void;
};

/**
 * The red "Aggiungi rilevazione" button + dialog used both on the
 * health page header and on the dashboard. Filters the available
 * categories/fields against the patient's selectedMetrics, with a
 * footer link out to the profile editor.
 *
 * Helper fields without an overview-key mapping (e.g. sleepBedtime)
 * tag along their parent metric — if the user tracks `sleepHours`, the
 * bedtime input stays in the form alongside it.
 */
export function AddBiometricDialog({
  initialSelectedMetrics,
  triggerClassName,
  triggerLabel = "Aggiungi rilevazione",
  triggerAriaLabel,
  hideTrigger = false,
  open: openProp,
  onOpenChange,
  category: categoryProp,
  onCategoryChange,
}: Props) {
  const { selected } = useOverviewPrefs(initialSelectedMetrics);
  const trackedSet = React.useMemo(
    () => new Set<string>(selected),
    [selected],
  );

  const filteredFields = React.useMemo(() => {
    const out = {} as Record<CategoryKey, MetricField[]>;
    for (const c of CATEGORIES) {
      out[c.key] = FIELDS[c.key].filter((f) => {
        const mapped = FIELD_TO_OVERVIEW_KEY[f.name];
        if (!mapped) return true; // helper input — show alongside its category
        return trackedSet.has(mapped);
      });
    }
    return out;
  }, [trackedSet]);

  const visibleCategories = React.useMemo(
    () =>
      CATEGORIES.filter((c) => {
        const mapped = FIELDS[c.key].filter((f) => FIELD_TO_OVERVIEW_KEY[f.name]);
        if (mapped.length === 0) return false; // specialty (skinfolds) — hide unless tracked
        return mapped.some((f) => {
          const k = FIELD_TO_OVERVIEW_KEY[f.name] as OverviewMetricKey;
          return trackedSet.has(k);
        });
      }),
    [trackedSet],
  );

  const [openInternal, setOpenInternal] = React.useState(false);
  const open = openProp ?? openInternal;
  const setOpen = React.useCallback(
    (next: boolean) => {
      if (onOpenChange) onOpenChange(next);
      if (openProp === undefined) setOpenInternal(next);
    },
    [onOpenChange, openProp],
  );

  const [categoryInternal, setCategoryInternal] = React.useState<CategoryKey>(
    visibleCategories[0]?.key ?? "body",
  );
  const formCategory = categoryProp ?? categoryInternal;
  const setFormCategory = React.useCallback(
    (next: CategoryKey) => {
      if (onCategoryChange) onCategoryChange(next);
      if (categoryProp === undefined) setCategoryInternal(next);
    },
    [onCategoryChange, categoryProp],
  );

  // Keep the active form category valid as the user toggles metrics
  // from the profile in another tab. Without this, the form could
  // briefly try to render fields for a category the user no longer
  // tracks.
  React.useEffect(() => {
    if (!visibleCategories.some((c) => c.key === formCategory)) {
      setFormCategory(visibleCategories[0]?.key ?? "body");
    }
  }, [visibleCategories, formCategory, setFormCategory]);

  // No tracked metrics → no form. We still render the trigger, but
  // open the dialog onto a small "go customize" callout instead of an
  // empty form.
  const hasAny = visibleCategories.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!hideTrigger && (
        <DialogTrigger
          aria-label={triggerAriaLabel ?? triggerLabel}
          className={cn(
            "focus-ring bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
            triggerClassName,
          )}
        >
          <Plus className="h-4 w-4" aria-hidden />
          {triggerLabel}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md md:max-w-lg">
        <DialogHeader>
          <DialogTitle>Nuova rilevazione</DialogTitle>
          <DialogDescription>
            Inserisci uno o più valori. I campi vuoti vengono ignorati.
          </DialogDescription>
        </DialogHeader>
        {hasAny ? (
          <>
            <div className="border-border/60 flex flex-wrap gap-1 border-b pb-3">
              {visibleCategories.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setFormCategory(c.key)}
                  className={cn(
                    "focus-ring rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    formCategory === c.key
                      ? "bg-primary-500/15 text-primary-500"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <MetricForm
                key={formCategory}
                category={formCategory}
                fields={filteredFields[formCategory]}
                dense
                onSaved={() => setOpen(false)}
              />
            </div>
          </>
        ) : (
          <div className="border-border/60 rounded-lg border border-dashed p-4 text-sm">
            Nessuna metrica tracciata. Scegline almeno una dal profilo per
            iniziare a registrare rilevazioni.
          </div>
        )}
        <div className="border-border/60 mt-2 flex items-center justify-between border-t pt-3">
          <span className="text-muted-foreground text-[11px]">
            Vedi solo le metriche che hai scelto di tracciare.
          </span>
          <Link
            href="/dashboard/patient/profile#metriche"
            className="focus-ring text-primary-500 hover:text-primary-500/80 inline-flex items-center gap-1 text-xs font-medium"
            onClick={() => setOpen(false)}
          >
            <SlidersHorizontal className="h-3 w-3" aria-hidden />
            Modifica metriche
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
