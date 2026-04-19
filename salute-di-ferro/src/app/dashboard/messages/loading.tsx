import { Skeleton } from "@/components/ui/skeleton";

export default function MessagesLoading() {
  return (
    <div
      className="flex h-full items-center justify-center page-in"
      role="status"
      aria-busy="true"
      aria-label="Caricamento conversazioni"
    >
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="h-16 w-16 rounded-full" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-64" />
      </div>
    </div>
  );
}
