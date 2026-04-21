"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, HeartPulse, Loader2, Mail, Phone } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PatientSummary = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function PatientProfilePage() {
  const params = useParams<{ id: string }>();

  const { data, isLoading } = useQuery<PatientSummary>({
    queryKey: ["patient", params.id],
    queryFn: async () => {
      const res = await fetch(`/api/clients/${params.id}`);
      if (!res.ok) throw new Error("Errore");
      return res.json();
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/dashboard/coach/patients"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Tutti gli assistiti
      </Link>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="bg-primary/20 text-primary text-xl">
              {initials(data.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {data.fullName}
            </h1>
            <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-4 text-sm">
              <span className="inline-flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {data.email}
              </span>
              {data.phone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> {data.phone}
                </span>
              )}
            </div>
          </div>
          <Link
            href={`/dashboard/coach/patients/${params.id}/health`}
            className="border-border hover:bg-muted inline-flex h-10 items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <HeartPulse className="h-4 w-4" />
            Dati salute
          </Link>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Scheda cliente</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          In costruzione. Biometria, referti, check-in e appuntamenti verranno
          abilitati nei prossimi moduli.
        </CardContent>
      </Card>
    </div>
  );
}
