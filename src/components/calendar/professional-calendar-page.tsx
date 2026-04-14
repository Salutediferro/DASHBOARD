"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { ProfessionalRole } from "@prisma/client";

import { Button } from "@/components/ui/button";
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
 * professional and lets them create new ones manually.
 */
export function ProfessionalCalendarPage({ role }: Props) {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [selected, setSelected] = React.useState<AppointmentDTO | null>(null);
  const { data: all = [] } = useAppointments();

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Calendario
          </h1>
          <p className="text-muted-foreground text-sm">
            Agenda dei tuoi appuntamenti
          </p>
        </div>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nuovo appuntamento
        </Button>
      </header>

      <CalendarView
        appointments={all}
        onSelect={setSelected}
        title="Settimana"
      />

      <AppointmentForm
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="PROFESSIONAL"
        professionalRole={role}
      />
      <AppointmentDetail
        appointment={selected}
        onClose={() => setSelected(null)}
        professional
      />
    </div>
  );
}
