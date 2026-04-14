"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type PatientListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
};

type CareRelationRow = {
  id: string;
  patientId: string;
  patient: PatientListItem;
};

type ListResponse = { items: CareRelationRow[]; total: number };

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function CoachClientsPage() {
  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["coach-patients"],
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE");
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          I miei assistiti
        </h1>
        <p className="text-muted-foreground text-sm">
          {data ? `${data.total} attivi` : "Caricamento..."}
        </p>
      </header>

      {isLoading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        </div>
      )}

      {data && data.items.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Users className="text-muted-foreground h-10 w-10" />
            <p className="text-muted-foreground text-sm">
              Nessun assistito attivo
            </p>
          </CardContent>
        </Card>
      )}

      {data && data.items.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Elenco</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col divide-y divide-border p-0">
            {data.items.map((rel) => (
              <Link
                key={rel.id}
                href={`/dashboard/coach/patients/${rel.patientId}`}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/40"
              >
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {initials(rel.patient.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {rel.patient.fullName}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {rel.patient.email}
                  </p>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
