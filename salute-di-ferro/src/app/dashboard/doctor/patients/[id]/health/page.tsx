"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { HealthTabs } from "@/components/health/health-tabs";

export default function DoctorPatientHealthPage() {
  const params = useParams<{ id: string }>();
  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/dashboard/doctor/patients/${params.id}`}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" /> Scheda cliente
      </Link>
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Dati salute
        </h1>
        <p className="text-muted-foreground text-sm">
          Vista clinica — solo lettura
        </p>
      </header>
      <HealthTabs patientId={params.id} readOnly />
    </div>
  );
}
