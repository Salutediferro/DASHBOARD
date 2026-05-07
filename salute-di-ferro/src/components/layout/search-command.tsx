"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import type { NavItem } from "@/lib/nav-items";
import { cn } from "@/lib/utils";

type Props = {
  items: NavItem[];
  /**
   * Controls which trigger is rendered.
   * - "responsive" (default): full trigger on md+, icon-only below.
   * - "full": always the wide button.
   * - "icon": always the icon-only button.
   */
  variant?: "responsive" | "full" | "icon";
  className?: string;
};

type Section = { title: string | null; items: NavItem[] };

/**
 * Group consecutive items sharing the same `group` value, preserving
 * source order. Mirrors the sidebar's grouping so the command palette
 * mirrors the visual hierarchy users already learned.
 */
function groupItems(items: NavItem[]): Section[] {
  const sections: Section[] = [];
  for (const item of items) {
    const title = item.group ?? null;
    const last = sections[sections.length - 1];
    if (last && last.title === title) {
      last.items.push(item);
    } else {
      sections.push({ title, items: [item] });
    }
  }
  return sections;
}

export function SearchCommand({
  items,
  variant = "responsive",
  className,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const showFull = variant === "full" || variant === "responsive";
  const showIcon = variant === "icon" || variant === "responsive";
  const sections = React.useMemo(() => groupItems(items), [items]);

  const onOpen = () => setOpen(true);
  const onSelect = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      {showFull && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Apri ricerca (⌘K)"
          className={cn(
            "focus-ring border-border/60 bg-muted/40 text-muted-foreground hover:bg-muted hover:text-foreground flex h-10 w-full max-w-[400px] items-center gap-2 rounded-md border px-3 text-sm transition-colors",
            variant === "responsive" && "hidden md:flex",
            className,
          )}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Cerca pagine, clienti…</span>
          <kbd className="border-border/70 bg-background text-muted-foreground inline-flex items-center gap-0.5 rounded border px-1.5 py-0.5 font-mono text-[10px]">
            ⌘K
          </kbd>
        </button>
      )}
      {showIcon && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Apri ricerca"
          className={cn(
            "focus-ring text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-10 w-10 items-center justify-center rounded-md transition-colors",
            variant === "responsive" && "md:hidden",
            className,
          )}
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      )}

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        className="sm:max-w-lg"
      >
        <Command>
          <CommandInput placeholder="Cerca pagine, clienti, esercizi…" />
          <CommandList>
            <CommandEmpty>Nessun risultato.</CommandEmpty>
            {sections.map((section, i) => (
              <React.Fragment key={section.title ?? `__no-title-${i}`}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={section.title ?? undefined}>
                  {section.items.map((item) => (
                    <CommandItem
                      key={item.href}
                      // Including the group title in `value` makes the
                      // group-name searchable too (e.g. typing "interazioni"
                      // surfaces every item in the Interazioni section).
                      value={`${item.label} ${section.title ?? ""}`}
                      onSelect={() => onSelect(item.href)}
                    >
                      <item.icon className="text-muted-foreground mr-2 h-4 w-4" />
                      <span>{item.label}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </React.Fragment>
            ))}
          </CommandList>
          <div className="border-border/60 text-muted-foreground flex items-center justify-between border-t px-3 py-2 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <Kbd>↵</Kbd> apri
            </span>
            <span className="inline-flex items-center gap-1">
              <Kbd>esc</Kbd> chiudi
            </span>
          </div>
        </Command>
      </CommandDialog>
    </>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="border-border/70 bg-background inline-flex items-center rounded border px-1 py-0.5 font-mono text-[10px]">
      {children}
    </kbd>
  );
}
