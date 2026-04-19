"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { ProfessionalRole } from "@prisma/client";

import PageHeader from "@/components/brand/page-header";
import { CalendarView } from "@/components/calendar/calendar-view";
import { AppointmentForm } from "@/components/calendar/appointment-form";
import { AppointmentDetail } from "@/components/calendar/appointment-detail";
import {
  useAppointments,
  type AppointmentDTO,
} from "@/lib/hooks/use-appointments";

type Props = {
  role: ProfessionalRole;
};

/**
 * Shared professional calendar page used by both DOCTOR and COACH
 * dashboards. Lists every appointment where the caller is the
 * professional and lets them create new ones manually — either via the
 * top CTA or by clicking an empty hour slot in the week/day view.
 */
export function ProfessionalCalendarPage({ role }: Props) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AppointmentDTO | null>(null);
  const [initialStart, setInitialStart] = React.useState<string | undefined>();
  const { data: all = [] } = useAppointments();

  const openCreate = React.useCallback((iso?: string) => {
    setInitialStart(iso);
    setCreateOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Calendario"
        description="L'agenda dei tuoi appuntamenti. Clicca un'ora libera per aggiungerne uno manualmente."
        className="-mx-4 -mt-4 md:-mx-8 md:-mt-8"
        actions={
          <button
            type="button"
            onClick={() => openCreate(undefined)}
            className="focus-ring inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Nuovo appuntamento
          </button>
        }
      />

      <CalendarView
        appointments={all}
        onSelect={setSelected}
        onEmptySlotClick={openCreate}
      />

      <AppointmentForm
        open={createOpen}
        onOpenChange={(v) => {
          setCreateOpen(v);
          if (!v) setInitialStart(undefined);
        }}
        mode="PROFESSIONAL"
        professionalRole={role}
        initialStart={initialStart}
      />
      <AppointmentDetail
        appointment={selected}
        onClose={() => setSelected(null)}
        professional
        asSheet
      />
    </div>
  );
}
