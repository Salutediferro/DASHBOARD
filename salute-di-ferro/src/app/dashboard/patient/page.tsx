import { redirect } from "next/navigation";
import type { AppointmentStatus, ProfessionalRole } from "@prisma/client";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { UserProfile } from "@/lib/hooks/use-user";
import {
  PatientHomeClient,
  type AppointmentRow,
  type BiometricRow,
  type CheckInRow,
  type ProfessionalEntry,
} from "./patient-home-client";

export const metadata = { title: "Dashboard — Salute di Ferro" };

// Fetched server-side and sent as typed props + React Query initialData.
// Eliminates the 5-query waterfall that the old client component kicked
// off on mount (appointments, check-ins, biometrics, professionals, me)
// — first paint now arrives fully populated.
export default async function PatientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      email: true,
      fullName: true,
      firstName: true,
      lastName: true,
      sex: true,
      birthDate: true,
      heightCm: true,
      phone: true,
      avatarUrl: true,
      taxCode: true,
      emergencyContact: true,
      role: true,
      onboardingCompleted: true,
      medicalConditions: true,
      allergies: true,
      medications: true,
      injuries: true,
      targetWeightKg: true,
      bio: true,
      specialties: true,
    },
  });
  if (!me) redirect("/login");
  if (me.role !== "PATIENT") redirect("/dashboard");

  const now = new Date();
  const windowEnd = new Date(now);
  windowEnd.setDate(windowEnd.getDate() + 30);

  const [appointments, checkIns, biometrics, relationships] =
    await Promise.all([
      prisma.appointment.findMany({
        where: {
          patientId: me.id,
          startTime: { gte: now, lte: windowEnd },
        },
        orderBy: { startTime: "asc" },
        select: {
          id: true,
          startTime: true,
          endTime: true,
          type: true,
          status: true,
          professionalId: true,
          professional: { select: { fullName: true } },
        },
      }),
      prisma.checkIn.findMany({
        where: { patientId: me.id },
        orderBy: { date: "desc" },
        take: 12,
        select: {
          id: true,
          date: true,
          weight: true,
          rating: true,
          status: true,
          professionalFeedback: true,
          professionalId: true,
        },
      }),
      prisma.biometricLog.findMany({
        where: { patientId: me.id },
        orderBy: { date: "desc" },
        take: 60,
        select: {
          id: true,
          date: true,
          weight: true,
          bmi: true,
          bodyFatPercentage: true,
          waistCm: true,
        },
      }),
      prisma.careRelationship.findMany({
        where: { patientId: me.id, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
        include: {
          professional: {
            select: {
              id: true,
              fullName: true,
              email: true,
              role: true,
              avatarUrl: true,
              bio: true,
              specialties: true,
            },
          },
        },
      }),
    ]);

  const profile: UserProfile = {
    id: me.id,
    email: me.email,
    fullName: me.fullName,
    firstName: me.firstName,
    lastName: me.lastName,
    sex: me.sex,
    birthDate: me.birthDate ? me.birthDate.toISOString().slice(0, 10) : null,
    heightCm: me.heightCm,
    phone: me.phone,
    avatarUrl: me.avatarUrl,
    taxCode: me.taxCode,
    emergencyContact: me.emergencyContact,
    role: me.role,
    onboardingCompleted: me.onboardingCompleted,
    medicalConditions: me.medicalConditions,
    allergies: me.allergies,
    medications: me.medications,
    injuries: me.injuries,
    targetWeightKg: me.targetWeightKg,
    bio: me.bio,
    specialties: me.specialties,
  };

  const initialAppointments: AppointmentRow[] = appointments.map((a) => ({
    id: a.id,
    startTime: a.startTime.toISOString(),
    endTime: a.endTime.toISOString(),
    type: a.type,
    status: a.status as AppointmentStatus,
    professionalId: a.professionalId,
    professionalName: a.professional?.fullName ?? null,
  }));

  const initialCheckIns: CheckInRow[] = checkIns.map((c) => ({
    id: c.id,
    date: c.date.toISOString(),
    weight: c.weight,
    rating: c.rating,
    status: c.status as "PENDING" | "REVIEWED",
    professionalFeedback: c.professionalFeedback,
    professionalId: c.professionalId,
  }));

  const initialBiometrics: BiometricRow[] = biometrics.map((b) => ({
    id: b.id,
    date: b.date.toISOString(),
    weight: b.weight,
    bmi: b.bmi,
    bodyFatPercentage: b.bodyFatPercentage,
    waistCm: b.waistCm,
  }));

  const initialProfessionals: ProfessionalEntry[] = relationships.map((r) => ({
    relationshipId: r.id,
    professionalRole: r.professionalRole as ProfessionalRole as
      | "DOCTOR"
      | "COACH",
    professional: r.professional,
  }));

  return (
    <PatientHomeClient
      profile={profile}
      initialAppointments={initialAppointments}
      initialCheckIns={initialCheckIns}
      initialBiometrics={initialBiometrics}
      initialProfessionals={initialProfessionals}
    />
  );
}
