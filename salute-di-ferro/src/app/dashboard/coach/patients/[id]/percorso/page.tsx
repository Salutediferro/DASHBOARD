"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Stethoscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type PrescribedItem = {
  id: string;
  name: string;
  dose: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: string | null;
  endDate: string | null;
  active: boolean;
  prescribedBy: { id: string; fullName: string } | null;
};

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function CoachPatientPercorsoPage() {
  const params = useParams<{ id: string }>();
  const patientId = params.id;

  const { data, isLoading } = useQuery<{ items: PrescribedItem[] }>({
    queryKey: ["therapy", "PRESCRIBED", patientId],
    queryFn: async () => {
      const res = await fetch(
        `/api/therapy?kind=PRESCRIBED&patientId=${patientId}`,
      );
      if (!res.ok) throw new Error("Errore caricamento");
      return res.json();
    },
  });

  const items = data?.items ?? [];
  const active = items.filter((i) => i.active);
  const archived = items.filter((i) => !i.active);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/dashboard/coach/patients/${patientId}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Scheda cliente
      </Link>

      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Percorso
        </h1>
        <p className="text-muted-foreground text-sm">
          Indicazioni del medico — solo lettura
        </p>
      </header>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Stethoscope className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground max-w-md text-sm">
              Il medico non ha ancora registrato indicazioni per questo
              cliente.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <PercorsoSection
            title="In corso"
            empty="Nessuna indicazione attiva."
            items={active}
          />
          {archived.length > 0 && (
            <PercorsoSection
              title="Archivio"
              empty=""
              items={archived}
            />
          )}
        </>
      )}
    </div>
  );
}

function PercorsoSection({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: PrescribedItem[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">{empty}</p>
        ) : (
          <ul className="divide-border divide-y">
            {items.map((i) => (
              <li
                key={i.id}
                className={cn(
                  "flex flex-wrap items-start gap-3 px-4 py-3",
                  !i.active && "opacity-70",
                )}
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-md">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{i.name}</p>
                    {i.dose && (
                      <Badge variant="outline" className="text-[10px]">
                        {i.dose}
                      </Badge>
                    )}
                    {!i.active && (
                      <Badge variant="secondary" className="text-[10px]">
                        Archiviato
                      </Badge>
                    )}
                  </div>
                  {i.frequency && (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {i.frequency}
                    </p>
                  )}
                  <p className="text-muted-foreground mt-1 text-[11px]">
                    Dal {fmtDate(i.startDate)}
                    {i.endDate && ` al ${fmtDate(i.endDate)}`}
                    {i.prescribedBy?.fullName &&
                      ` · Prescritto da ${i.prescribedBy.fullName}`}
                  </p>
                  {i.notes && (
                    <p className="mt-1 text-xs whitespace-pre-wrap">
                      {i.notes}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
