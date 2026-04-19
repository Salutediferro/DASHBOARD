import Link from "next/link";
import {
  Activity,
  CalendarClock,
  ClipboardList,
  HeartPulse,
  NotebookPen,
  Pill,
  ShieldCheck,
  UserPlus,
} from "lucide-react";

import EmptyState from "@/components/brand/empty-state";
import type { TimelineEntry } from "@/lib/queries/dashboard";

type Props = {
  items: TimelineEntry[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
};

export default function RecentActivity({
  items,
  emptyTitle = "Nessuna attività recente",
  emptyDescription = "Le ultime voci appariranno qui man mano che i dati arrivano.",
  emptyAction,
}: Props) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title={emptyTitle}
        description={emptyDescription}
        action={emptyAction}
      />
    );
  }
  return (
    <ul className="surface-1 divide-y divide-border/60 overflow-hidden rounded-xl">
      {items.map((ev) => (
        <li key={ev.id}>
          {ev.href && ev.href !== "#" ? (
            <Link
              href={ev.href}
              className="focus-ring flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
            >
              <ActivityRow ev={ev} />
            </Link>
          ) : (
            <div className="flex items-start gap-3 px-4 py-3">
              <ActivityRow ev={ev} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function ActivityRow({ ev }: { ev: TimelineEntry }) {
  return (
    <>
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
        {iconFor(ev.kind)}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium">{ev.title}</span>
        {ev.description && (
          <span className="truncate text-xs text-muted-foreground">
            {ev.description}
          </span>
        )}
      </span>
      <span className="shrink-0 text-[11px] text-muted-foreground">
        {formatRelative(ev.date)}
      </span>
    </>
  );
}

function iconFor(kind: TimelineEntry["kind"]): React.ReactElement {
  const props = { className: "h-4 w-4", "aria-hidden": true } as const;
  switch (kind) {
    case "CHECK_IN":
      return <ClipboardList {...props} />;
    case "BIOMETRIC":
      return <HeartPulse {...props} />;
    case "APPOINTMENT":
      return <CalendarClock {...props} />;
    case "REPORT":
      return <ClipboardList {...props} />;
    case "MEDICATION":
      return <Pill {...props} />;
    case "SYMPTOM":
      return <NotebookPen {...props} />;
    case "USER_SIGNUP":
      return <UserPlus {...props} />;
    case "AUDIT":
      return <ShieldCheck {...props} />;
  }
}

export function formatRelative(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const abs = Math.abs(diffMs);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (abs < hour) {
    const m = Math.max(1, Math.round(abs / minute));
    return diffMs < 0 ? `${m}m fa` : `fra ${m}m`;
  }
  if (abs < day) {
    const h = Math.round(abs / hour);
    return diffMs < 0 ? `${h}h fa` : `fra ${h}h`;
  }
  if (abs < 7 * day) {
    const days = Math.round(abs / day);
    return diffMs < 0 ? `${days}g fa` : `fra ${days}g`;
  }
  return d.toLocaleDateString("it-IT", { day: "2-digit", month: "short" });
}
