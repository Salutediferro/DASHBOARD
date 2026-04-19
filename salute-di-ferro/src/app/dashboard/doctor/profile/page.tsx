"use client";

import { useQuery } from "@tanstack/react-query";

import { DangerZone } from "@/components/profile/danger-zone";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileHero } from "@/components/profile/profile-hero";
import { CompletenessCard } from "@/components/profile/completeness-card";
import { useUser } from "@/lib/hooks/use-user";
import { useAppointments } from "@/lib/hooks/use-appointments";
import { useMedicalReports } from "@/lib/hooks/use-medical-records";
import { computeProfessionalCompleteness } from "@/lib/profile-completeness";

export default function DoctorProfilePage() {
  const { profile, isLoading } = useUser();
  const appointments = useAppointments();
  const reports = useMedicalReports();

  const patientsQuery = useQuery<{ total: number }>({
    queryKey: ["my-patients", { for: "profile" }],
    queryFn: async () => {
      const res = await fetch("/api/clients?status=ACTIVE");
      if (!res.ok) return { total: 0 };
      return res.json();
    },
  });

  if (isLoading || !profile) {
    return (
      <div className="flex flex-col gap-6 pb-12">
        <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  const completeness = computeProfessionalCompleteness(profile);
  const completedVisits =
    appointments.data?.filter((a) => a.status === "COMPLETED").length ?? 0;
  const stats = [
    { label: "Pazienti attivi", value: patientsQuery.data?.total ?? 0 },
    { label: "Visite completate", value: completedVisits },
    { label: "Referti caricati", value: reports.data?.length ?? 0 },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ProfileHero profile={profile} stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileForm showProfessional />
          <DangerZone />
        </div>
        <aside className="order-first lg:order-last">
          <div className="lg:sticky lg:top-20">
            <CompletenessCard
              completeness={completeness}
              ctaLabel="Vai ai campi"
              ctaHref="/dashboard/doctor/profile"
              fieldBaseHref="/dashboard/doctor/profile"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
