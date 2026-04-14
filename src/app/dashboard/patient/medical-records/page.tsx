"use client";

import { ReportList } from "@/components/medical-records/report-list";
import { ReportUpload } from "@/components/medical-records/report-upload";

export default function PatientMedicalRecordsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Cartella clinica
        </h1>
        <p className="text-muted-foreground text-sm">
          I tuoi referti, in forma cifrata. Tu decidi chi può vederli.
        </p>
      </header>
      <ReportUpload />
      <ReportList canManagePermissions canDelete />
    </div>
  );
}
