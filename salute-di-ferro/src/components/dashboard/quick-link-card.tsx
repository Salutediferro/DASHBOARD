import Link from "next/link";
import type { LucideIcon } from "lucide-react";

type QuickLinkCardProps = {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
};

export default function QuickLinkCard({
  href,
  icon: Icon,
  title,
  description,
}: QuickLinkCardProps) {
  return (
    <Link
      href={href}
      className="surface-1 focus-ring group flex items-start gap-3 rounded-xl p-4 transition-colors hover:bg-muted/50"
    >
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500/10 text-primary-500">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{title}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}

export function formatItalianDate(d = new Date()): string {
  return d.toLocaleDateString("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
