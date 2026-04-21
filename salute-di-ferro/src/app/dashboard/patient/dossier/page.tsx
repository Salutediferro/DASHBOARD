import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { DossierPrintButton } from "@/components/patient/dossier-print-button";

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtDateTime(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleString("it-IT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtNum(n: number | null | undefined, digits = 1): string {
  return n == null ? "—" : n.toFixed(digits);
}

export default async function PatientDossierPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      email: true,
      fullName: true,
      firstName: true,
      lastName: true,
      sex: true,
      birthDate: true,
      heightCm: true,
      phone: true,
      taxCode: true,
      emergencyContact: true,
      medicalConditions: true,
      allergies: true,
      medications: true,
      injuries: true,
      createdAt: true,
    },
  });
  if (!me) notFound();
  if (me.role !== "PATIENT") {
    redirect("/dashboard");
  }

  const [
    biometrics,
    checkIns,
    appointments,
    reports,
    professionals,
    medications,
    symptoms,
  ] = await Promise.all([
      prisma.biometricLog.findMany({
        where: { patientId: me.id },
        orderBy: { date: "desc" },
        take: 30,
        select: {
          id: true,
          date: true,
          weight: true,
          bmi: true,
          bodyFatPercentage: true,
          waistCm: true,
          systolicBP: true,
          diastolicBP: true,
          restingHR: true,
          glucoseFasting: true,
          sleepHours: true,
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
          notes: true,
          professionalFeedback: true,
        },
      }),
      prisma.appointment.findMany({
        where: { patientId: me.id },
        orderBy: { startTime: "desc" },
        take: 20,
        select: {
          id: true,
          startTime: true,
          endTime: true,
          type: true,
          status: true,
          notes: true,
          professional: { select: { fullName: true, role: true } },
        },
      }),
      prisma.medicalReport.findMany({
        where: { patientId: me.id },
        orderBy: [{ issuedAt: "desc" }, { uploadedAt: "desc" }],
        take: 50,
        select: {
          id: true,
          title: true,
          category: true,
          issuedAt: true,
          uploadedAt: true,
          notes: true,
        },
      }),
      prisma.careRelationship.findMany({
        where: { patientId: me.id, status: "ACTIVE" },
        include: {
          professional: {
            select: { fullName: true, role: true, email: true },
          },
        },
      }),
      prisma.therapyItem.findMany({
        where: { patientId: me.id },
        orderBy: [{ active: "desc" }, { startDate: "desc" }],
        take: 50,
      }),
      prisma.symptomLog.findMany({
        where: { patientId: me.id },
        orderBy: { date: "desc" },
        take: 30,
      }),
    ]);

  const generatedAt = new Date();
  const age = me.birthDate
    ? Math.floor(
        (generatedAt.getTime() - new Date(me.birthDate).getTime()) /
          (365.25 * 24 * 3600 * 1000),
      )
    : null;

  return (
    <div className="dossier-root bg-background mx-auto flex max-w-3xl flex-col gap-8 p-6 print:max-w-full print:gap-6 print:p-0">
      <style>{`
        @media print {
          @page { margin: 18mm; }
          .no-print { display: none !important; }
          .dossier-root { color: #000; background: #fff; }
          .dossier-section { break-inside: avoid; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Dossier sanitario
          </h1>
          <p className="text-muted-foreground text-sm">
            Esportazione leggibile di tutti i tuoi dati salute. Usa il tasto
            qui sotto e seleziona &quot;Salva come PDF&quot;.
          </p>
        </div>
        <DossierPrintButton />
      </header>

      <section className="dossier-section">
        <h2 className="font-heading text-lg font-semibold">
          {me.fullName || me.email}
        </h2>
        <p className="text-muted-foreground text-xs">
          Generato il {fmtDateTime(generatedAt)}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm md:grid-cols-3">
          <InfoRow k="Email" v={me.email} />
          <InfoRow k="Telefono" v={me.phone ?? "—"} />
          <InfoRow k="Codice fiscale" v={me.taxCode ?? "—"} />
          <InfoRow k="Data di nascita" v={fmtDate(me.birthDate)} />
          <InfoRow k="Età" v={age != null ? `${age} anni` : "—"} />
          <InfoRow k="Sesso" v={me.sex ?? "—"} />
          <InfoRow k="Altezza" v={me.heightCm ? `${me.heightCm} cm` : "—"} />
          <InfoRow k="Contatto emergenza" v={me.emergencyContact ?? "—"} />
          <InfoRow
            k="Registrato il"
            v={fmtDate(me.createdAt)}
          />
        </div>
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Informazioni cliniche
        </h3>
        <div className="mt-2 flex flex-col gap-2 text-sm">
          <TextBlock label="Patologie note" value={me.medicalConditions} />
          <TextBlock label="Allergie" value={me.allergies} />
          <TextBlock label="Terapie / supplementi" value={me.medications} />
          <TextBlock label="Infortuni / limitazioni" value={me.injuries} />
        </div>
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Professionisti di riferimento
        </h3>
        {professionals.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nessun professionista collegato.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {professionals.map((p) => (
              <li key={p.id}>
                <span className="font-medium">{p.professional.fullName}</span>{" "}
                · {p.professionalRole} · {p.professional.email}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Biometria — ultime {biometrics.length} misurazioni
        </h3>
        {biometrics.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nessuna misurazione registrata.
          </p>
        ) : (
          <table className="mt-2 w-full text-xs">
            <thead>
              <tr className="border-border border-b text-left">
                <th className="py-1 pr-2">Data</th>
                <th className="py-1 pr-2">Peso</th>
                <th className="py-1 pr-2">BMI</th>
                <th className="py-1 pr-2">Pressione</th>
                <th className="py-1 pr-2">HR riposo</th>
                <th className="py-1 pr-2">Glicemia</th>
                <th className="py-1 pr-2">Sonno</th>
              </tr>
            </thead>
            <tbody>
              {biometrics.map((b) => (
                <tr key={b.id} className="border-border/60 border-b">
                  <td className="py-1 pr-2">{fmtDate(b.date)}</td>
                  <td className="py-1 pr-2">{fmtNum(b.weight)} kg</td>
                  <td className="py-1 pr-2">{fmtNum(b.bmi)}</td>
                  <td className="py-1 pr-2">
                    {b.systolicBP != null && b.diastolicBP != null
                      ? `${b.systolicBP}/${b.diastolicBP}`
                      : "—"}
                  </td>
                  <td className="py-1 pr-2">
                    {b.restingHR ? `${b.restingHR} bpm` : "—"}
                  </td>
                  <td className="py-1 pr-2">
                    {b.glucoseFasting ? `${b.glucoseFasting} mg/dL` : "—"}
                  </td>
                  <td className="py-1 pr-2">
                    {b.sleepHours ? `${b.sleepHours}h` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Check-in settimanali — ultimi {checkIns.length}
        </h3>
        {checkIns.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nessun check-in inviato.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3 text-sm">
            {checkIns.map((c) => (
              <li key={c.id} className="border-border border-l-2 pl-3">
                <p className="font-medium">
                  {fmtDate(c.date)} · {fmtNum(c.weight)} kg
                  {c.rating != null && ` · rating ${c.rating}/5`} ·{" "}
                  <span className="text-muted-foreground">{c.status}</span>
                </p>
                {c.notes && (
                  <p className="text-muted-foreground mt-1 text-xs whitespace-pre-wrap">
                    Note cliente: {c.notes}
                  </p>
                )}
                {c.professionalFeedback && (
                  <p className="mt-1 text-xs whitespace-pre-wrap">
                    Feedback: {c.professionalFeedback}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Appuntamenti — ultimi {appointments.length}
        </h3>
        {appointments.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nessun appuntamento in archivio.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {appointments.map((a) => (
              <li key={a.id}>
                <span className="font-medium">
                  {fmtDateTime(a.startTime)}
                </span>{" "}
                · {a.type} · {a.status} ·{" "}
                {a.professional?.fullName ?? "—"}
                {a.notes && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {a.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Supplementi in corso ({medications.filter((m) => m.active).length})
        </h3>
        {medications.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nessun supplemento registrato.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {medications.map((m) => (
              <li key={m.id}>
                <span className="font-medium">{m.name}</span>
                {m.dose && ` · ${m.dose}`}
                {m.frequency && ` · ${m.frequency}`}
                {" · "}
                {m.active ? (
                  "attivo"
                ) : (
                  <span className="text-muted-foreground">archiviato</span>
                )}
                {m.startDate && ` · da ${fmtDate(m.startDate)}`}
                {m.endDate && ` → ${fmtDate(m.endDate)}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Diario salute — ultimi {symptoms.length} giorni
        </h3>
        {symptoms.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nessuna voce nel diario.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {symptoms.map((s) => {
              const parts: string[] = [];
              if (s.mood != null) parts.push(`umore ${s.mood}/5`);
              if (s.energy != null) parts.push(`energia ${s.energy}/5`);
              if (s.sleepQuality != null)
                parts.push(`sonno ${s.sleepQuality}/5`);
              if (s.symptoms.length) parts.push(s.symptoms.join(", "));
              return (
                <li key={s.id}>
                  <span className="font-medium">{fmtDate(s.date)}</span>
                  {parts.length > 0 && ` · ${parts.join(" · ")}`}
                  {s.notes && (
                    <span className="text-muted-foreground"> — {s.notes}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="dossier-section">
        <h3 className="font-heading text-base font-semibold">
          Referti in archivio
        </h3>
        {reports.length === 0 ? (
          <p className="text-muted-foreground mt-2 text-sm">
            Nessun referto caricato.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-1 text-sm">
            {reports.map((r) => (
              <li key={r.id}>
                <span className="font-medium">{r.title}</span> · {r.category} ·{" "}
                {fmtDate(r.issuedAt ?? r.uploadedAt)}
                {r.notes && (
                  <span className="text-muted-foreground">
                    {" "}
                    — {r.notes}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground mt-3 text-xs">
          I file originali non sono inclusi. Puoi scaricarli singolarmente
          dalla cartella del cliente.
        </p>
      </section>

      <footer className="dossier-section text-muted-foreground mt-4 text-[10px]">
        Documento generato automaticamente da Salute di Ferro. Non sostituisce
        una relazione medica ufficiale.
      </footer>
    </div>
  );
}

function InfoRow({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{k}: </span>
      <span className="font-medium">{v}</span>
    </div>
  );
}

function TextBlock({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <span className="text-muted-foreground text-xs uppercase tracking-wider">
        {label}
      </span>
      <p className="whitespace-pre-wrap">{value?.trim() || "—"}</p>
    </div>
  );
}
