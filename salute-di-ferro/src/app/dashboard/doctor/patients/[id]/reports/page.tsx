"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { ReportList } from "@/components/medical-records/report-list";
import { ReportUpload } from "@/components/medical-records/report-upload";

export default function DoctorPatientReportsPage() {
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
          Referti cliente
        </h1>
        <p className="text-muted-foreground text-sm">
          Vedi solo i referti per cui il cliente ti ha concesso l&apos;accesso.
          I referti che carichi tu sono automaticamente condivisi con te.
        </p>
      </header>
      <ReportUpload patientId={params.id} />
      <ReportList patientId={params.id} canDelete />
    </div>
  );
}
