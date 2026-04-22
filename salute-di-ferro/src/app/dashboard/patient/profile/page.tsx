"use client";

import { useQuery } from "@tanstack/react-query";

import { CompletenessCard } from "@/components/profile/completeness-card";
import { DangerZone } from "@/components/profile/danger-zone";
import { ProfileForm } from "@/components/profile/profile-form";
import { ProfileHero } from "@/components/profile/profile-hero";
import { useUser } from "@/lib/hooks/use-user";
import { computePatientCompleteness } from "@/lib/profile-completeness";
import { useMedicalReports } from "@/lib/hooks/use-medical-records";
import { useAppointments } from "@/lib/hooks/use-appointments";

export default function PatientProfilePage() {
  const { profile, isLoading } = useUser();
  const completeness = computePatientCompleteness(profile);
  const reports = useMedicalReports();
  const appointments = useAppointments();

  // Team of care size (approx: distinct active professionals).
  const teamQuery = useQuery<
    Array<{ professional: { id: string } }>
  >({
    queryKey: ["my-professionals"],
    queryFn: async () => {
      const res = await fetch("/api/me/professionals");
      if (!res.ok) return [];
      return res.json();
    },
  });

  if (isLoading || !profile) return <PageSkeleton />;

  const stats = [
    {
      label: "Team di cura",
      value: teamQuery.data?.length ?? 0,
    },
    {
      label: "Referti",
      value: reports.data?.length ?? 0,
    },
    {
      label: "Appuntamenti",
      value: appointments.data?.length ?? 0,
    },
  ];

  return (
    <div className="flex flex-col gap-6 pb-12">
      <ProfileHero profile={profile} stats={stats} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          <ProfileForm showClinical hideHeader />
          <DangerZone />
        </div>
        <aside className="order-first lg:order-last">
          <div className="lg:sticky lg:top-20">
            <CompletenessCard
              completeness={completeness}
              ctaLabel="Vai ai campi"
              ctaHref="/dashboard/patient/profile"
              fieldBaseHref="/dashboard/patient/profile"
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="h-40 w-full animate-pulse rounded-xl bg-muted" />
      <div className="h-48 w-full animate-pulse rounded-xl bg-muted" />
    </div>
  );
}
