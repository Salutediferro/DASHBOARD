"use client";

import * as React from "react";
import { Stethoscope, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useLinkedProfessionals,
  useRevokeProfessional,
} from "@/lib/hooks/use-professionals";

type Props = {
  onSearchClick: () => void;
};

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

export function LinkedProfessionalsCard({ onSearchClick }: Props) {
  const { data, isLoading } = useLinkedProfessionals();
  const revoke = useRevokeProfessional();

  const doctors = (data ?? []).filter((r) => r.professionalRole === "DOCTOR");

  function onRevoke(id: string, name: string) {
    if (
      !confirm(
        `Vuoi revocare l'accesso a ${name}? Non potrà più vedere i tuoi dati di nutrizione.`,
      )
    ) {
      return;
    }
    revoke
      .mutateAsync(id)
      .then(() => toast.success(`Accesso revocato a ${name}`))
      .catch((err: Error) => toast.error(err.message));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <div>
          <CardTitle className="text-base">Professionisti collegati</CardTitle>
          <p className="text-muted-foreground text-xs">
            Vedono il tuo piano e il tuo diario nutrizionale.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onSearchClick}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Cerca un professionista
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {isLoading ? (
          <p className="text-muted-foreground text-xs">Caricamento…</p>
        ) : doctors.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-3 text-center text-xs">
            Nessun professionista ha accesso ai tuoi dati di nutrizione.
          </p>
        ) : (
          doctors.map((r) => (
            <div
              key={r.relationshipId}
              className="border-border flex items-center gap-3 rounded-lg border p-2.5"
            >
              <Avatar className="h-9 w-9">
                {r.professional.avatarUrl && (
                  <AvatarImage
                    src={r.professional.avatarUrl}
                    alt={r.professional.fullName}
                  />
                )}
                <AvatarFallback className="text-xs">
                  {initials(r.professional.fullName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {r.professional.fullName}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  <Stethoscope className="text-muted-foreground h-3 w-3" />
                  {r.professional.specialties.length > 0 ? (
                    r.professional.specialties.slice(0, 3).map((s) => (
                      <Badge
                        key={s}
                        variant="outline"
                        className="text-[10px]"
                      >
                        {s}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-muted-foreground text-[11px]">
                      Professionista
                    </span>
                  )}
                </div>
              </div>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                aria-label={`Revoca accesso a ${r.professional.fullName}`}
                onClick={() =>
                  onRevoke(r.relationshipId, r.professional.fullName)
                }
                disabled={revoke.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
