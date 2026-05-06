"use client";

import * as React from "react";
import Link from "next/link";
import { Apple, Loader2, Plus, UserRound } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuthoredPatients } from "@/lib/hooks/use-nutrition";

import { PatientPickerDialog } from "./_components/patient-picker-dialog";

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

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function DoctorNutritionPage() {
  const { data, isLoading } = useAuthoredPatients();
  const [pickerOpen, setPickerOpen] = React.useState(false);

  const rows = data ?? [];

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading inline-flex items-center gap-2 text-3xl font-semibold tracking-tight">
            <Apple className="text-primary-500 h-7 w-7" />
            Nutrizione
          </h1>
          <p className="text-muted-foreground text-sm">
            I pazienti per cui hai preparato un piano nutrizionale.
          </p>
        </div>
        <Button type="button" onClick={() => setPickerOpen(true)}>
          <Plus className="h-4 w-4" /> Nuovo piano
        </Button>
      </header>

      {isLoading ? (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <Loader2 className="text-muted-foreground h-5 w-5 animate-spin" />
          </CardContent>
        </Card>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Apple className="text-muted-foreground h-10 w-10" />
            <p className="max-w-md text-sm">
              Non hai ancora preparato un piano nutrizionale per nessun
              paziente.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPickerOpen(true)}
            >
              <Plus className="h-3.5 w-3.5" /> Crea il primo piano
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <Link
              key={row.patient.id}
              href={`/dashboard/doctor/nutrition/${row.patient.id}`}
              className="group focus-ring border-border bg-card hover:border-primary-500/50 rounded-xl border p-4 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar className="h-11 w-11">
                  {row.patient.avatarUrl && (
                    <AvatarImage
                      src={row.patient.avatarUrl}
                      alt={row.patient.fullName}
                    />
                  )}
                  <AvatarFallback className="text-xs">
                    {initials(row.patient.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-semibold">
                      {row.patient.fullName}
                    </p>
                    {row.latestPlan.archivedAt == null ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Attivo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Archiviato
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 truncate text-xs">
                    {row.latestPlan.title}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Aggiornato {fmt(row.latestPlan.updatedAt)}
                  </p>
                </div>
                <UserRound className="text-muted-foreground h-4 w-4" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <PatientPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} />
    </div>
  );
}
