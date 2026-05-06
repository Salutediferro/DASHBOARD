"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  PROFESSIONAL_SPECIALTIES,
  type ProfessionalSpecialty,
} from "@/lib/professional-specialties";

type Props = {
  value: string[];
  onChange: (next: ProfessionalSpecialty[]) => void;
  /** Maximum entries the user can pick. Defaults to 20. */
  max?: number;
  /** Trigger label when no specialty is selected. */
  placeholder?: string;
  className?: string;
};

/**
 * Multi-select picker for `User.specialties`. Renders selected entries as
 * removable chips and a combobox to add more from the curated list.
 */
export function SpecialtyPicker({
  value,
  onChange,
  max = 20,
  placeholder = "Aggiungi una specialità",
  className,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const selectedSet = React.useMemo(() => new Set(value), [value]);

  const toggle = (s: ProfessionalSpecialty) => {
    if (selectedSet.has(s)) {
      onChange(value.filter((v) => v !== s) as ProfessionalSpecialty[]);
    } else {
      if (value.length >= max) return;
      // Preserve canonical order so the saved value is stable.
      const next = PROFESSIONAL_SPECIALTIES.filter((x) =>
        x === s ? true : selectedSet.has(x),
      );
      onChange(next);
    }
  };

  const remove = (s: string) => {
    onChange(value.filter((v) => v !== s) as ProfessionalSpecialty[]);
  };

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((s) => (
            <Badge key={s} variant="secondary" className="gap-1 pr-1">
              {s}
              <button
                type="button"
                onClick={() => remove(s)}
                aria-label={`Rimuovi ${s}`}
                className="hover:bg-foreground/10 -mr-0.5 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          aria-expanded={open}
          aria-haspopup="listbox"
          className="border-input bg-background focus-ring flex h-10 w-full items-center justify-between rounded-md border px-3 text-sm font-normal"
        >
          <span className="text-muted-foreground">{placeholder}</span>
          <ChevronsUpDown className="text-muted-foreground ml-2 h-4 w-4 shrink-0" />
        </PopoverTrigger>
        <PopoverContent className="w-[var(--anchor-width)] p-0" align="start" sideOffset={6}>
          <Command>
            <CommandInput placeholder="Cerca..." />
            <CommandList>
              <CommandEmpty>Nessun risultato.</CommandEmpty>
              <CommandGroup>
                {PROFESSIONAL_SPECIALTIES.map((s) => {
                  const checked = selectedSet.has(s);
                  return (
                    <CommandItem
                      key={s}
                      value={s}
                      onSelect={() => toggle(s)}
                      disabled={!checked && value.length >= max}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          checked ? "opacity-100" : "opacity-0",
                        )}
                      />
                      {s}
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
