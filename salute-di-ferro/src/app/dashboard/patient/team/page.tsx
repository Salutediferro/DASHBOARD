"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  Check,
  HeartHandshake,
  Loader2,
  MessageSquare,
  Search,
  SearchX,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import type { ProfessionalRole } from "@prisma/client";

import PageHeader from "@/components/brand/page-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import {
  useLinkedProfessionals,
  useProfessionalSearch,
  type LinkedProfessional,
  type ProfessionalSearchResult,
} from "@/lib/hooks/use-professionals";
import { useStartConversation } from "@/lib/hooks/use-conversations";
import { PROFESSIONAL_SPECIALTIES } from "@/lib/professional-specialties";

/**
 * "Team di Ferro" — patient-facing professional directory.
 *
 * Two distinct UX paths from the same card:
 *   - Already linked: messaging + share-data shortcuts. The "share" CTA
 *     deep-links to the medical-records page where the per-report
 *     `permission-manager` already does the granular consent flow; we
 *     just nudge the patient with a toast naming the target professional.
 *   - Not linked: a single "Richiedi appuntamento" CTA that auto-creates
 *     the CareRelationship (the API already allows the patient to
 *     unilaterally self-link) and opens the existing booking wizard.
 *     The wizard's `["me", "professionals"]` query is on a different
 *     cache key from `useLinkedProfessionals`, so we invalidate both.
 *
 * Idle state (no query / no specialty filter) shows the patient's own
 * team, so the page is useful even before they search. As soon as they
 * type or filter, we swap to the global search results — which already
 * carry a `linked` flag so existing team members surface naturally with
 * the right action set.
 */

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

type ProCardData = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  bio: string | null;
  specialties: string[];
  linked: boolean;
  /** Needed to pre-select the pro in the booking wizard. */
  role: ProfessionalRole;
};

function fromLinked(l: LinkedProfessional): ProCardData {
  return {
    id: l.professional.id,
    fullName: l.professional.fullName,
    avatarUrl: l.professional.avatarUrl,
    bio: l.professional.bio,
    specialties: l.professional.specialties,
    linked: true,
    role: l.professionalRole,
  };
}

function fromSearch(p: ProfessionalSearchResult): ProCardData {
  return {
    id: p.id,
    fullName: p.fullName,
    avatarUrl: p.avatarUrl,
    bio: p.bio,
    specialties: p.specialties,
    linked: p.linked,
    // The current /api/professionals/search only returns DOCTOR rows
    // (see route handler) — this hardcode mirrors that contract. If we
    // open search to coaches too, return `role` from the API instead.
    role: "DOCTOR",
  };
}

export default function PatientTeamPage() {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [debounced, setDebounced] = React.useState("");
  const [specialty, setSpecialty] = React.useState<string>(SPECIALTY_ALL);
  const [bookingFor, setBookingFor] = React.useState<ProCardData | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const isSearching =
    debounced.trim().length > 0 || specialty !== SPECIALTY_ALL;

  const linked = useLinkedProfessionals();
  const search = useProfessionalSearch(
    debounced,
    specialty === SPECIALTY_ALL ? "" : specialty,
  );

  const startChat = useStartConversation();

  const items: ProCardData[] = React.useMemo(() => {
    if (isSearching) return (search.data ?? []).map(fromSearch);
    return (linked.data ?? []).map(fromLinked);
  }, [isSearching, search.data, linked.data]);

  const isLoading = isSearching ? search.isLoading : linked.isLoading;

  async function onSendMessage(prof: ProCardData) {
    try {
      const res = await startChat.mutateAsync(prof.id);
      router.push(`/dashboard/messages/${res.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function onShareData(prof: ProCardData) {
    toast.info(
      `Apri un referto nella tua Cartella per condividerlo con ${prof.fullName}.`,
    );
    router.push("/dashboard/patient/medical-records");
  }

  function onRequestAppointment(prof: ProCardData) {
    // No eager team-grant: the booking flow itself establishes the
    // CareRelationship on the server (see /api/appointments POST).
    // Until the patient confirms a slot, this professional is not added
    // to their team — protecting the pro from contact by strangers.
    setBookingFor(prof);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team di Ferro"
        description="Il tuo team di professionisti, in un posto solo. Cercane di nuovi, scrivi a chi già ti segue o richiedi un appuntamento."
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
      />

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            id="team-search"
            placeholder="Cerca per nome…"
            className="pl-9!"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoComplete="off"
          />
        </div>
        <Select
          value={specialty}
          onValueChange={(v) => setSpecialty(v ?? SPECIALTY_ALL)}
        >
          <SelectTrigger
            id="team-specialty"
            aria-label="Filtra per specialità"
            className="w-full sm:w-56"
          >
            <SelectValue>
              {(v) =>
                v === SPECIALTY_ALL ? "Tutte le specialità" : (v as string)
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SPECIALTY_ALL}>Tutte le specialità</SelectItem>
            {PROFESSIONAL_SPECIALTIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <p className="text-muted-foreground text-xs">
        {isSearching
          ? `Risultati ricerca${items.length ? ` (${items.length})` : ""}`
          : items.length === 0
            ? "Il tuo team è vuoto. Cerca un professionista per iniziare."
            : `Il tuo team (${items.length})`}
      </p>

      {isLoading && (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            {isSearching ? (
              <>
                <SearchX className="text-muted-foreground/40 h-9 w-9" />
                <p className="text-muted-foreground text-xs">
                  Nessun professionista trovato.
                </p>
              </>
            ) : (
              <>
                <HeartHandshake className="text-muted-foreground/40 h-9 w-9" />
                <p className="text-sm font-medium">
                  Nessun professionista nel team
                </p>
                <p className="text-muted-foreground max-w-xs text-xs">
                  Usa la ricerca qui sopra per trovare il tuo medico, coach o
                  nutrizionista.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!isLoading && items.length > 0 && (
        <ul className="flex flex-col gap-3">
          {items.map((p) => (
            <ProfessionalCard
              key={p.id}
              prof={p}
              busy={startChat.isPending && startChat.variables === p.id}
              onSendMessage={onSendMessage}
              onShareData={onShareData}
              onRequestAppointment={onRequestAppointment}
            />
          ))}
        </ul>
      )}

      <AppointmentForm
        open={bookingFor != null}
        onOpenChange={(v) => {
          if (!v) setBookingFor(null);
        }}
        mode="PATIENT"
        initialProfessional={
          bookingFor
            ? {
                id: bookingFor.id,
                fullName: bookingFor.fullName,
                role: bookingFor.role,
                avatarUrl: bookingFor.avatarUrl,
                specialties: bookingFor.specialties,
              }
            : undefined
        }
      />
    </div>
  );
}

function ProfessionalCard({
  prof,
  busy,
  onSendMessage,
  onShareData,
  onRequestAppointment,
}: {
  prof: ProCardData;
  busy: boolean;
  onSendMessage: (p: ProCardData) => void;
  onShareData: (p: ProCardData) => void;
  onRequestAppointment: (p: ProCardData) => void;
}) {
  return (
    <li className="border-border/70 bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:flex-row sm:items-start">
      <Avatar className="h-12 w-12 shrink-0">
        {prof.avatarUrl && (
          <AvatarImage src={prof.avatarUrl} alt={prof.fullName} />
        )}
        <AvatarFallback className="bg-primary/15 text-primary">
          {initials(prof.fullName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-sm font-semibold">{prof.fullName}</h3>
          {prof.linked && (
            <Badge
              variant="secondary"
              className="text-success shrink-0 gap-1"
            >
              <Check className="h-3 w-3" /> Nel team
            </Badge>
          )}
        </div>
        {prof.specialties.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1">
            {prof.specialties.slice(0, 4).map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">
                {s}
              </Badge>
            ))}
            {prof.specialties.length > 4 && (
              <Badge
                variant="outline"
                className="text-muted-foreground text-[10px]"
              >
                +{prof.specialties.length - 4}
              </Badge>
            )}
          </div>
        )}
        {prof.bio && (
          <p className="text-muted-foreground mt-2 line-clamp-2 text-xs">
            {prof.bio}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
        {prof.linked ? (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onSendMessage(prof)}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <MessageSquare className="h-3.5 w-3.5" />
              )}
              Invia messaggio
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onShareData(prof)}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              Condividi referti
            </Button>
          </>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={() => onRequestAppointment(prof)}
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CalendarPlus className="h-3.5 w-3.5" />
            )}
            Richiedi appuntamento
          </Button>
        )}
      </div>
    </li>
  );
}
