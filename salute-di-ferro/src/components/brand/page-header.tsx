import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type PageHeaderCrumb = {
  label: string;
  href?: string;
};

export type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: PageHeaderCrumb[];
  actions?: ReactNode;
  sticky?: boolean;
  className?: string;
};

export default function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  // Default OFF: sticky headers were overlapping the filter pills /
  // section headers below them on content-dense pages (Referti,
  // Appuntamenti). Pages that genuinely want a sticky title can opt in.
  sticky = false,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        // Flat full-bleed bar rather than a card: keeps the translucent
        // "glass" effect used on `.surface-glass` but drops the rounded
        // corners and side borders that made the header look like a
        // floating card stacked on top of the page's other cards.
        "page-header-glass w-full border-b border-border/60 px-6 py-4",
        sticky && "sticky top-0 z-30",
        className,
      )}
    >
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="mb-2 flex items-center gap-1 text-xs text-muted-foreground"
        >
          {breadcrumbs.map((c, i) => {
            const last = i === breadcrumbs.length - 1;
            return (
              <span key={`${c.label}-${i}`} className="inline-flex items-center gap-1">
                {c.href && !last ? (
                  <Link
                    href={c.href}
                    className="focus-ring rounded transition-colors hover:text-foreground"
                  >
                    {c.label}
                  </Link>
                ) : (
                  <span className={cn(last && "text-foreground")}>{c.label}</span>
                )}
                {!last && <ChevronRight className="h-3 w-3 opacity-60" aria-hidden />}
              </span>
            );
          })}
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-display text-2xl md:text-3xl">{title}</h1>
          {description && (
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        {actions && (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        )}
      </div>
    </header>
  );
}
