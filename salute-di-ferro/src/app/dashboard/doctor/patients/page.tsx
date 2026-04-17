import { PatientsListSection } from "@/components/invitations/patients-list-section";

export default function DoctorPatientsPage() {
  return (
    <PatientsListSection
      basePath="/dashboard/doctor/patients"
      title="I miei pazienti"
    />
  );
}
