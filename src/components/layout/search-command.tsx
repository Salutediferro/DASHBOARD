"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
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

  const onOpen = () => setOpen(true);

  return (
    <>
      {showFull && (
        <button
          type="button"
          onClick={onOpen}
          aria-label="Apri ricerca (⌘K)"
          className={cn(
            "focus-ring flex h-10 w-full max-w-[400px] items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            variant === "responsive" && "hidden md:flex",
            className,
          )}
        >
          <Search className="h-4 w-4 shrink-0" aria-hidden />
          <span className="flex-1 text-left">Cerca pagine, pazienti…</span>
          <kbd className="inline-flex items-center gap-0.5 rounded border border-border/70 bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
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
            "focus-ring inline-flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            variant === "responsive" && "md:hidden",
            className,
          )}
        >
          <Search className="h-4 w-4" aria-hidden />
        </button>
      )}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Cerca pagine, clienti, esercizi..." />
        <CommandList>
          <CommandEmpty>Nessun risultato.</CommandEmpty>
          <CommandGroup heading="Navigazione">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <CommandItem
                  key={item.href}
                  onSelect={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                >
                  <Icon className="mr-2 h-4 w-4" />
                  <span>{item.label}</span>
                </CommandItem>
              );
            })}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
