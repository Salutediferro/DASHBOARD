"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowLeft,
  Calendar,
  Eye,
  FileText,
  HeartPulse,
  Pill,
  ShieldAlert,
  Stethoscope,
  UserRound,
  UsersRound,
} from "lucide-react";
import type { UserRole } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminCardsSkeleton } from "@/components/admin/admin-skeletons";

type Professional = { id: string; fullName: string; role?: UserRole };

type Appointment = {
  id: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  professional?: Professional | null;
  patient?: { id: string; fullName: string } | null;
};

type MedicalReport = {
  id: string;
  title: string;
  category: string;
  fileName?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  issuedAt?: string | null;
  uploadedAt: string;
  uploadedBy?: { id: string; fullName: string } | null;
  patient?: { id: string; fullName: string } | null;
};

type BiometricRow = {
  id: string;
  date: string;
  weight: number | null;
  bmi: number | null;
  systolicBP: number | null;
  diastolicBP: number | null;
  glucoseFasting: number | null;
  sleepHours: number | null;
  energyLevel: number | null;
};

type TherapyRow = {
  id: string;
  kind: "PRESCRIBED" | "SELF";
  name: string;
  dose: string | null;
  frequency: string | null;
  startDate: string | null;
  endDate: string | null;
  prescribedBy?: { id: string; fullName: string } | null;
};

type SymptomRow = {
  id: string;
  date: string;
  mood: number | null;
  energy: number | null;
  sleepQuality: number | null;
  symptoms: string[];
  notes: string | null;
};

type CareRelationship = {
  id: string;
  professionalRole: "DOCTOR" | "COACH";
  startDate: string;
  professional: { id: string; fullName: string; email: string; role: UserRole };
};

type Caseload = {
  id: string;
  startDate: string;
  patient: { id: string; fullName: string; email: string; deletedAt: string | null };
};

type AvailabilitySlot = {
  id: string;
  dayOfWeek: number | null;
  date: string | null;
  startTime: string;
  endTime: string;
  isRecurring: boolean;
};

type UserBase = {
  id: string;
  email: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  role: UserRole;
  phone: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  createdAt: string;
  deletedAt: string | null;
  onboardingCompleted: boolean;
  organization: { id: string; name: string } | null;
};

type PatientPayload = {
  user: UserBase;
  role: "PATIENT";
  biometrics: BiometricRow[];
  appointments: { upcoming: Appointment[]; past: Appointment[] };
  medicalReports: MedicalReport[];
  therapyItems: TherapyRow[];
  symptomLogs: SymptomRow[];
  careRelationships: CareRelationship[];
};

type ProPayload = {
  user: UserBase;
  role: "DOCTOR" | "COACH";
  caseload: Caseload[];
  upcomingAppointments: Appointment[];
  availabilitySlots: AvailabilitySlot[];
  uploadedReports: MedicalReport[];
};

type AdminPayload = { user: UserBase; role: "ADMIN" };

type ViewAsPayload = PatientPayload | ProPayload | AdminPayload;

const DAY_LABEL = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ViewAsPage() {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading, isError, error } = useQuery<ViewAsPayload>({
    queryKey: ["admin-view-as", id],
    queryFn: async () => {
      const res = await fetch(`/api/admin/users/${id}/view-as`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof json?.error === "string" ? json.error : "Errore",
        );
      }
      return json;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-10 w-full rounded" />
        <Skeleton className="h-5 w-36" />
        <div className="flex items-center gap-4">
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-3 w-64" />
          </div>
        </div>
        <AdminCardsSkeleton count={5} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <p className="text-muted-foreground text-sm">
            {error instanceof Error
              ? error.message
              : "Impossibile caricare la view."}
          </p>
          <Link
            href={`/dashboard/admin/users/${id}`}
            className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna al dettaglio utente
          </Link>
        </CardContent>
      </Card>
    );
  }

  const { user } = data;
  const isDisabled = !!user.deletedAt;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "-mx-4 flex items-center gap-3 border-y border-amber-500/30 bg-amber-500/10 px-4 py-3",
          "md:-mx-8 md:px-8",
        )}
      >
        <Eye className="h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
        <div className="flex-1 text-sm">
          <span className="font-semibold">Modalità visualizzazione</span>
          <span className="text-muted-foreground">
            {" "}
            · Stai vedendo i dati di {user.fullName} (
            {user.email}) come se fossi lui. Azione loggata come{" "}
            <code className="text-xs">ADMIN_VIEW_AS</code>. Nessuna modifica
            possibile da questa pagina.
          </span>
        </div>
      </div>

      <Link
        href={`/dashboard/admin/users/${id}`}
        className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Torna al dettaglio utente
      </Link>

      <header className="flex flex-wrap items-start gap-4">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              {user.fullName}
            </h1>
            <Badge variant="secondary">{user.role}</Badge>
            {isDisabled && (
              <Badge
                variant="secondary"
                className="gap-1 bg-red-500/15 text-red-700 dark:text-red-300"
              >
                <ShieldAlert className="h-3 w-3" />
                Disabilitato
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {user.email}
            {user.phone ? ` · ${user.phone}` : ""}
            {user.organization ? ` · ${user.organization.name}` : ""}
            {" · "}Dal {formatDate(user.createdAt)}
          </p>
        </div>
      </header>

      {data.role === "PATIENT" && <PatientView data={data} />}
      {(data.role === "DOCTOR" || data.role === "COACH") && (
        <ProView data={data} />
      )}
      {data.role === "ADMIN" && (
        <Card>
          <CardContent className="p-6 text-muted-foreground text-sm">
            Il ruolo ADMIN non ha un cruscotto operativo da simulare. Usa il
            detail utente per le azioni amministrative.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon: Icon,
  children,
  empty,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2">
        <Icon className="text-muted-foreground h-4 w-4" />
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {empty ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-sm">
            Nessun dato.
          </p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}

function PatientView({ data }: { data: PatientPayload }) {
  return (
    <>
      <SectionCard
        title="Professionisti collegati"
        icon={UsersRound}
        empty={data.careRelationships.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.careRelationships.map((rel) => (
            <li key={rel.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <UserRound className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">
                {rel.professional.fullName}
              </span>
              <Badge variant="outline" className="text-xs">
                {rel.professionalRole === "DOCTOR" ? "Medico" : "Coach"}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {rel.professional.email}
              </span>
              <span className="text-muted-foreground ml-auto text-xs">
                Dal {formatDate(rel.startDate)}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Prossimi appuntamenti"
        icon={Calendar}
        empty={data.appointments.upcoming.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.appointments.upcoming.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-sm font-medium tabular-nums">
                {formatDateTime(a.startTime)}
              </span>
              <Badge variant="outline" className="text-xs">
                {a.type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {a.status}
              </Badge>
              {a.professional && (
                <span className="text-muted-foreground text-xs">
                  con {a.professional.fullName}
                </span>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Ultime misurazioni"
        icon={HeartPulse}
        empty={data.biometrics.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.biometrics.map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <span className="text-muted-foreground w-24 tabular-nums text-xs">
                {formatDate(b.date)}
              </span>
              {b.weight != null && <span>{b.weight} kg</span>}
              {b.bmi != null && (
                <span className="text-muted-foreground">BMI {b.bmi.toFixed(1)}</span>
              )}
              {b.systolicBP != null && b.diastolicBP != null && (
                <span className="text-muted-foreground">
                  {b.systolicBP}/{b.diastolicBP} mmHg
                </span>
              )}
              {b.glucoseFasting != null && (
                <span className="text-muted-foreground">
                  glic {b.glucoseFasting} mg/dL
                </span>
              )}
              {b.sleepHours != null && (
                <span className="text-muted-foreground">
                  sonno {b.sleepHours}h
                </span>
              )}
              {b.energyLevel != null && (
                <span className="text-muted-foreground">
                  energia {b.energyLevel}/10
                </span>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Terapie attive"
        icon={Pill}
        empty={data.therapyItems.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.therapyItems.map((t) => (
            <li key={t.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{t.name}</span>
                <Badge variant="outline" className="text-xs">
                  {t.kind === "PRESCRIBED" ? "Prescritto" : "Self"}
                </Badge>
                {t.prescribedBy && (
                  <span className="text-muted-foreground text-xs">
                    da {t.prescribedBy.fullName}
                  </span>
                )}
              </div>
              <div className="text-muted-foreground text-xs">
                {t.dose && <>Dose {t.dose} · </>}
                {t.frequency && <>Frequenza {t.frequency} · </>}
                {t.startDate && <>Dal {formatDate(t.startDate)}</>}
                {t.endDate && <> al {formatDate(t.endDate)}</>}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Diario sintomi (7 giorni)"
        icon={Activity}
        empty={data.symptomLogs.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.symptomLogs.map((s) => (
            <li key={s.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-muted-foreground tabular-nums text-xs">
                  {formatDate(s.date)}
                </span>
                {s.mood != null && <span>Umore {s.mood}/5</span>}
                {s.energy != null && (
                  <span className="text-muted-foreground">Energia {s.energy}/5</span>
                )}
                {s.sleepQuality != null && (
                  <span className="text-muted-foreground">Sonno {s.sleepQuality}/5</span>
                )}
              </div>
              {s.symptoms.length > 0 && (
                <div className="text-muted-foreground text-xs">
                  {s.symptoms.join(", ")}
                </div>
              )}
              {s.notes && (
                <div className="text-muted-foreground text-xs italic">
                  &ldquo;{s.notes}&rdquo;
                </div>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Referti (metadata)"
        icon={FileText}
        empty={data.medicalReports.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.medicalReports.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.title}</span>
                <Badge variant="outline" className="text-xs">
                  {r.category}
                </Badge>
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                {r.fileName && <span>{r.fileName}</span>}
                <span>{formatFileSize(r.fileSize)}</span>
                {r.issuedAt && <span>Emesso {formatDate(r.issuedAt)}</span>}
                <span>Caricato {formatDate(r.uploadedAt)}</span>
                {r.uploadedBy && <span>da {r.uploadedBy.fullName}</span>}
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}

function ProView({ data }: { data: ProPayload }) {
  return (
    <>
      <SectionCard
        title="Pazienti seguiti"
        icon={UsersRound}
        empty={data.caseload.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.caseload.map((rel) => (
            <li key={rel.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <UserRound className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">
                {rel.patient.fullName}
              </span>
              <span className="text-muted-foreground text-xs">
                {rel.patient.email}
              </span>
              {rel.patient.deletedAt && (
                <Badge variant="secondary" className="gap-1 bg-red-500/15 text-red-700 dark:text-red-300 text-xs">
                  Disabilitato
                </Badge>
              )}
              <span className="text-muted-foreground ml-auto text-xs">
                Dal {formatDate(rel.startDate)}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Prossimi appuntamenti"
        icon={Calendar}
        empty={data.upcomingAppointments.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.upcomingAppointments.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="text-sm font-medium tabular-nums">
                {formatDateTime(a.startTime)}
              </span>
              <Badge variant="outline" className="text-xs">
                {a.type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {a.status}
              </Badge>
              {a.patient && (
                <span className="text-muted-foreground text-xs">
                  con {a.patient.fullName}
                </span>
              )}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Disponibilità"
        icon={Stethoscope}
        empty={data.availabilitySlots.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.availabilitySlots.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              {s.isRecurring && s.dayOfWeek != null ? (
                <Badge variant="outline" className="text-xs">
                  {DAY_LABEL[s.dayOfWeek] ?? "—"} ricorrente
                </Badge>
              ) : s.date ? (
                <Badge variant="outline" className="text-xs">
                  {formatDate(s.date)}
                </Badge>
              ) : null}
              <span className="tabular-nums">
                {formatTime(s.startTime)} – {formatTime(s.endTime)}
              </span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard
        title="Ultimi referti caricati"
        icon={FileText}
        empty={data.uploadedReports.length === 0}
      >
        <ul className="divide-border divide-y">
          {data.uploadedReports.map((r) => (
            <li key={r.id} className="flex flex-col gap-1 px-4 py-3 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{r.title}</span>
                <Badge variant="outline" className="text-xs">
                  {r.category}
                </Badge>
              </div>
              <div className="text-muted-foreground flex flex-wrap gap-3 text-xs">
                {r.patient && <span>Paziente: {r.patient.fullName}</span>}
                <span>Caricato {formatDate(r.uploadedAt)}</span>
              </div>
            </li>
          ))}
        </ul>
      </SectionCard>
    </>
  );
}
