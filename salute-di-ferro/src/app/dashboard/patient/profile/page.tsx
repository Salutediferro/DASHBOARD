"use client";

import { CompletenessCard } from "@/components/profile/completeness-card";
import { DangerZone } from "@/components/profile/danger-zone";
import { ProfileForm } from "@/components/profile/profile-form";
import { useUser } from "@/lib/hooks/use-user";
import { computePatientCompleteness } from "@/lib/profile-completeness";

export default function PatientProfilePage() {
  const { profile } = useUser();
  const completeness = computePatientCompleteness(profile);

  return (
    <div className="flex flex-col gap-6">
      {profile && (
        <CompletenessCard completeness={completeness} ctaLabel="Vai ai campi" />
      )}
      <ProfileForm showClinical />
      <DangerZone />
    </div>
  );
}
