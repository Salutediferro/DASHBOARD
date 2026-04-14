"use client";

import { AvailabilityEditor } from "@/components/calendar/availability-editor";

export default function CoachAvailabilityPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Disponibilità
        </h1>
        <p className="text-muted-foreground text-sm">
          Slot settimanali ricorrenti ed eccezioni una tantum
        </p>
      </header>
      <AvailabilityEditor />
    </div>
  );
}
