"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CalendarPlus,
  CalendarOff,
  Check,
  Circle,
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
import { cn } from "@/lib/utils";

/**
 * "Team di Ferro" — patient-facing professional directory.
 *
 * Two-column layout on `lg+`:
 *   - Left  → "Il tuo team": professionals already linked via an ACTIVE
 *     CareRelationship. Each card surfaces messaging + share-referti
 *     shortcuts.
 *   - Right → "Cerca professionisti": every available pro in the org,
 *     filterable by name and/or specialty. Cards expose a "Richiedi
 *     appuntamento" CTA that opens the booking wizard pre-selected to
 *     that pro. The relationship is created server-side as a side
 *     effect of confirming the booking — there's no eager grant.
 *
 * On smaller screens the two columns stack: team first, search below.
 *
 * Both columns reuse the same card component. Specialties and bio show
 * up wherever they're populated; an availability badge ("Disponibile" /
 * "Non disponibile") tracks the pro's self-set `acceptingPatients`
 * flag and gates the booking CTA in the search column.
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
  acceptingPatients: boolean;
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
    acceptingPatients: l.professional.acceptingPatients,
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
    acceptingPatients: p.acceptingPatients,
    // /api/professionals/search currently returns DOCTORs only — coaches
    // come in via /api/me/professionals (linked column) instead.
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

  const linked = useLinkedProfessionals();
  // Always fetch — the directory is useful even before the patient
  // types anything. Result list is capped at 25 server-side.
  const search = useProfessionalSearch(debounced, specialty === SPECIALTY_ALL ? "" : specialty, {
    enabled: true,
  });

  const startChat = useStartConversation();

  const myTeam = React.useMemo(() => (linked.data ?? []).map(fromLinked), [linked.data]);
  // Don't show pros that are already in the team in the search column —
  // they're already represented on the left, and the duplicate looks
  // confusing on mobile where the columns stack.
  const searchResults = React.useMemo(
    () => (search.data ?? []).map(fromSearch).filter((p) => !p.linked),
    [search.data],
  );

  async function onSendMessage(prof: ProCardData) {
    try {
      const res = await startChat.mutateAsync(prof.id);
      router.push(`/dashboard/messages/${res.id}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  function onShareData(prof: ProCardData) {
    toast.info(`Apri un referto nella tua Cartella per condividerlo con ${prof.fullName}.`);
    router.push("/dashboard/patient/medical-records");
  }

  function onRequestAppointment(prof: ProCardData) {
    // No eager team-grant: the booking flow itself establishes the
    // CareRelationship on the server (see /api/appointments POST).
    setBookingFor(prof);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team di Ferro"
        description="Il tuo team di professionisti, in un posto solo. Cercane di nuovi, scrivi a chi già ti segue o richiedi un appuntamento."
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
        {/* ── Left: my team ────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <header>
            <h2 className="font-heading text-lg font-semibold">
              Il tuo team
              {!linked.isLoading && (
                <span className="text-muted-foreground ml-1.5 text-sm font-normal">
                  ({myTeam.length})
                </span>
              )}
            </h2>
            <p className="text-muted-foreground text-xs">
              I professionisti che ti seguono attivamente.
            </p>
          </header>

          {linked.isLoading ? (
            <ColumnLoader />
          ) : myTeam.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <HeartHandshake className="text-muted-foreground/40 h-9 w-9" />
                <p className="text-sm font-medium">Nessuno nel team</p>
                <p className="text-muted-foreground max-w-xs text-xs">
                  Trova un professionista nella ricerca a destra e prenota un primo appuntamento per
                  aggiungerlo al tuo team.
                </p>
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {myTeam.map((p) => (
                <ProfessionalCard
                  key={p.id}
                  prof={p}
                  context="team"
                  busy={startChat.isPending && startChat.variables === p.id}
                  onSendMessage={onSendMessage}
                  onShareData={onShareData}
                  onRequestAppointment={onRequestAppointment}
                />
              ))}
            </ul>
          )}
        </section>

        {/* ── Right: search ────────────────────────────────────────── */}
        <section className="flex flex-col gap-3">
          <header>
            <h2 className="font-heading text-lg font-semibold">Cerca professionisti</h2>
            <p className="text-muted-foreground text-xs">
              Filtra per nome o specialità. Funziona anche con la sola specialità se non conosci
              nessuno per nome.
            </p>
          </header>

          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                id="team-search"
                placeholder="Nome…"
                className="pl-9!"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete="off"
              />
            </div>
            <Select value={specialty} onValueChange={(v) => setSpecialty(v ?? SPECIALTY_ALL)}>
              <SelectTrigger
                id="team-specialty"
                aria-label="Filtra per specialità"
                className="w-full sm:w-56"
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

          {search.isLoading ? (
            <ColumnLoader />
          ) : searchResults.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                <SearchX className="text-muted-foreground/40 h-9 w-9" />
                <p className="text-muted-foreground text-xs">Nessun professionista trovato.</p>
              </CardContent>
            </Card>
          ) : (
            <ul className="flex flex-col gap-3">
              {searchResults.map((p) => (
                <ProfessionalCard
                  key={p.id}
                  prof={p}
                  context="search"
                  busy={false}
                  onSendMessage={onSendMessage}
                  onShareData={onShareData}
                  onRequestAppointment={onRequestAppointment}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

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

function ColumnLoader() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
    </div>
  );
}

function ProfessionalCard({
  prof,
  context,
  busy,
  onSendMessage,
  onShareData,
  onRequestAppointment,
}: {
  prof: ProCardData;
  /** "team" = left column, always linked; "search" = right column. */
  context: "team" | "search";
  busy: boolean;
  onSendMessage: (p: ProCardData) => void;
  onShareData: (p: ProCardData) => void;
  onRequestAppointment: (p: ProCardData) => void;
}) {
  // Show the availability chip in the search column always (the patient
  // is deciding whether to book) and in the team column only when the
  // pro has paused new acquisitions, as a heads-up that follow-ups may
  // not go through smoothly.
  const showAvailability = context === "search" || !prof.acceptingPatients;

  return (
    <li className="border-border/70 bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-xs sm:flex-row sm:items-start">
      <Avatar className="h-12 w-12 shrink-0">
        {prof.avatarUrl && <AvatarImage src={prof.avatarUrl} alt={prof.fullName} />}
        <AvatarFallback className="bg-primary/15 text-primary">
          {initials(prof.fullName)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <h3 className="truncate text-sm font-semibold">{prof.fullName}</h3>
          {context === "team" && (
            <Badge variant="secondary" className="text-success shrink-0 gap-1">
              <Check className="h-3 w-3" /> Nel team
            </Badge>
          )}
          {showAvailability && <AvailabilityBadge available={prof.acceptingPatients} />}
        </div>

        {/* Specialties are shown in full (no slice + "+N" overflow) so a
            patient searching by specialty can see every match a pro
            covers — the powerlifter scanning for matching trainers
            shouldn't have to click anywhere to read the list. */}
        {prof.specialties.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {prof.specialties.map((s) => (
              <Badge key={s} variant="outline" className="text-[10px]">
                {s}
              </Badge>
            ))}
          </div>
        )}

        {/* `bio?.trim()` so a string of whitespace doesn't render an empty
            paragraph block. Full text — no line-clamp — for the same
            "let the patient actually read it" reason as specialties. */}
        {prof.bio?.trim() && (
          <p className="text-muted-foreground mt-2 text-xs whitespace-pre-wrap">{prof.bio}</p>
        )}
      </div>

      <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
        {context === "team" ? (
          <>
            <Button
              type="button"
              size="sm"
              onClick={() => onRequestAppointment(prof)}
            >
              <CalendarPlus className="h-3.5 w-3.5" />
              Richiedi appuntamento
            </Button>
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
            <Button type="button" size="sm" variant="outline" onClick={() => onShareData(prof)}>
              <ShieldCheck className="h-3.5 w-3.5" />
              Condividi referti
            </Button>
          </>
        ) : prof.acceptingPatients ? (
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
        ) : (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled
            className="cursor-not-allowed"
            aria-label="Non disponibile"
          >
            <CalendarOff className="h-3.5 w-3.5" />
            Non disponibile
          </Button>
        )}
      </div>
    </li>
  );
}

function AvailabilityBadge({ available }: { available: boolean }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "shrink-0 gap-1 text-[10px]",
        available
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border/60 bg-muted text-muted-foreground",
      )}
    >
      <Circle
        className={cn(
          "h-2 w-2",
          available
            ? "fill-emerald-500 text-emerald-500"
            : "fill-muted-foreground/40 text-muted-foreground/40",
        )}
      />
      {available ? "Disponibile" : "Non disponibile"}
    </Badge>
  );
}
