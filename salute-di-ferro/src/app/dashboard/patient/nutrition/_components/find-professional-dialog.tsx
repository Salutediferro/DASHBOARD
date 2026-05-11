"use client";

import * as React from "react";
import { CalendarPlus, Check, Loader2, Search, SearchX } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  useProfessionalSearch,
  type ProfessionalSearchResult,
} from "@/lib/hooks/use-professionals";
import { PROFESSIONAL_SPECIALTIES } from "@/lib/professional-specialties";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /**
   * Called when the patient picks a pro to book with. The dialog closes
   * itself; the parent is responsible for opening the booking wizard.
   * Adding a pro to the team is no longer unilateral — it happens as a
   * server-side side effect of confirming the booking.
   */
  onRequestAppointment: (prof: ProfessionalSearchResult) => void;
};

const SPECIALTY_ALL = "__all__";

function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

export function FindProfessionalDialog({ open, onOpenChange, onRequestAppointment }: Props) {
  const [query, setQuery] = React.useState("");
  const [specialty, setSpecialty] = React.useState<string>(SPECIALTY_ALL);
  const [debounced, setDebounced] = React.useState("");

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const search = useProfessionalSearch(debounced, specialty === SPECIALTY_ALL ? "" : specialty);

  React.useEffect(() => {
    if (!open) {
      setQuery("");
      setSpecialty(SPECIALTY_ALL);
      setDebounced("");
    }
  }, [open]);

  function onPickForBooking(prof: ProfessionalSearchResult) {
    onRequestAppointment(prof);
    onOpenChange(false);
  }

  const items = search.data ?? [];
  const idle = debounced.trim().length === 0 && specialty === SPECIALTY_ALL;
  const empty = !idle && !search.isLoading && items.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cerca un professionista</DialogTitle>
          <DialogDescription>
            Prenota un primo appuntamento per aggiungerlo al tuo team. Una volta collegato, potrai
            condividere i tuoi dati di nutrizione.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              id="prof-search"
              placeholder="Cerca per nome…"
              className="pl-9!"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
              autoFocus
            />
          </div>
          <Select value={specialty} onValueChange={(v) => setSpecialty(v ?? SPECIALTY_ALL)}>
            <SelectTrigger
              id="prof-specialty"
              aria-label="Filtra per specialità"
              className="w-full sm:w-48"
            >
              <SelectValue>
                {(v) => (v === SPECIALTY_ALL ? "Tutti gli specialisti" : (v as string))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SPECIALTY_ALL}>Tutti gli specialisti</SelectItem>
              {PROFESSIONAL_SPECIALTIES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div
          // Internal scroll keeps filter row fixed; min-h-0 so the flex
          // child shrinks correctly inside DialogContent's grid.
          className="-mx-2 flex max-h-[55vh] min-h-0 flex-col overflow-y-auto"
        >
          {idle && (
            <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
              <Search className="text-muted-foreground/40 h-8 w-8" />
              <p className="text-muted-foreground text-xs">
                Cerca per nome o filtra per specialità.
              </p>
            </div>
          )}
          {search.isLoading && (
            <div className="flex items-center justify-center px-2 py-10">
              <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
            </div>
          )}
          {empty && (
            <div className="flex flex-col items-center gap-2 px-2 py-10 text-center">
              <SearchX className="text-muted-foreground/40 h-8 w-8" />
              <p className="text-muted-foreground text-xs">Nessun professionista trovato.</p>
            </div>
          )}
          {items.length > 0 && (
            <ul className="flex flex-col gap-2 px-2">
              {items.map((p) => (
                <li
                  key={p.id}
                  className={cn(
                    "border-border/70 bg-card flex items-start gap-3 rounded-xl border p-3 shadow-xs transition-colors",
                    p.linked
                      ? "bg-muted/40 border-border/50"
                      : "hover:border-primary-500/40 hover:bg-muted/30",
                  )}
                >
                  <Avatar className="h-10 w-10 shrink-0">
                    {p.avatarUrl && <AvatarImage src={p.avatarUrl} alt={p.fullName} />}
                    <AvatarFallback className="bg-primary/15 text-primary text-xs">
                      {initials(p.fullName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{p.fullName}</p>
                    {p.specialties.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.specialties.slice(0, 3).map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">
                            {s}
                          </Badge>
                        ))}
                        {p.specialties.length > 3 && (
                          <Badge variant="outline" className="text-muted-foreground text-[10px]">
                            +{p.specialties.length - 3}
                          </Badge>
                        )}
                      </div>
                    )}
                    {p.bio && (
                      <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{p.bio}</p>
                    )}
                  </div>
                  <div className="shrink-0">
                    {p.linked ? (
                      <Badge variant="secondary" className="text-success gap-1">
                        <Check className="h-3 w-3" /> Collegato
                      </Badge>
                    ) : (
                      <Button type="button" size="sm" onClick={() => onPickForBooking(p)}>
                        <CalendarPlus className="h-3.5 w-3.5" />
                        Richiedi appuntamento
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
