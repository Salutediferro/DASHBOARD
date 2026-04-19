"use client";

import * as React from "react";
import { Plus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import PageHeader from "@/components/brand/page-header";
import { ReportList } from "@/components/medical-records/report-list";
import { ReportUpload } from "@/components/medical-records/report-upload";

export default function PatientMedicalRecordsPage() {
  const [uploadOpen, setUploadOpen] = React.useState(false);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Referti medici"
        description="Tutti i referti in un posto solo. Li vedi solo tu, finché non decidi di condividerli con un professionista."
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
        actions={
          <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
            <DialogTrigger className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90">
              <Plus className="h-4 w-4" aria-hidden />
              Carica referto
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg md:max-w-xl">
              <DialogHeader>
                <DialogTitle>Carica un nuovo referto</DialogTitle>
                <DialogDescription>
                  Il referto viene cifrato al caricamento. Solo tu lo vedi finché
                  non concedi l&apos;accesso a un professionista.
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[70vh] overflow-y-auto">
                <ReportUpload onSuccess={() => setUploadOpen(false)} />
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <ReportList canManagePermissions canDelete />
    </div>
  );
}
