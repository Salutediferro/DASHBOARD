import { Skeleton } from "@/components/ui/skeleton";

/**
 * Shared skeleton primitives for the admin pages. The Loader2 spinner
 * we used before renders a blank card for ~1s on 4G mobile — a full
 * skeleton that matches the shape of the incoming data eliminates the
 * layout jump and reads as "fetching" instead of "broken".
 */

/**
 * List of rows with avatar, two text lines, trailing meta — matches the
 * shape of `/admin/users`, `/admin/audit`, `/admin/invitations`.
 */
export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div
      className="border-border bg-card overflow-hidden rounded-xl border"
      role="status"
      aria-busy="true"
      aria-label="Caricamento elenco"
    >
      <div className="border-border flex items-center justify-between border-b px-4 py-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-3 w-20" />
      </div>
      <ul className="divide-border divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="flex items-center gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-3 w-3/5" />
            </div>
            <Skeleton className="h-4 w-4 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Stack of full-width cards, each with title + a couple of text lines
 * + a trailing control — matches `/admin/settings`, `/admin/feature-flags`,
 * `/admin/broadcast`.
 */
export function AdminCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul
      className="flex flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="Caricamento"
    >
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="border-border bg-card flex flex-col gap-3 rounded-xl border p-5"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5" />
          <div className="mt-1 flex items-center gap-2">
            <Skeleton className="h-5 w-12 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="ml-auto h-9 w-24 rounded-md" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Grid of small tiles — service status cards or metric stats. Matches
 * `/admin/health` and the stat row on `/admin/metrics`.
 */
export function AdminTilesSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-busy="true"
      aria-label="Caricamento"
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="border-border bg-card flex flex-col gap-3 rounded-xl border p-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-5 w-12 rounded-full" />
          </div>
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}
