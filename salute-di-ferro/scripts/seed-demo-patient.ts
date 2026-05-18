/**
 * scripts/seed-demo-patient.ts
 *
 * Popola un account paziente esistente con dati demo realistici
 * (biometrics, terapia, appuntamento, referto, check-in) per dare ai
 * collaboratori in fase test qualcosa di visibile + interagibile sulla
 * dashboard Agente di Ferro.
 *
 * USO (da root del repo `salute-di-ferro/`, NON dal worktree):
 *
 *   # Dev/staging (Supabase non-prod):
 *   npx tsx scripts/seed-demo-patient.ts <userId> [scenario]
 *
 *   # Produzione (richiede flag esplicita per evitare data corruption):
 *   SEED_DEMO_ALLOW_PRODUCTION=1 npx tsx scripts/seed-demo-patient.ts <userId> [scenario]
 *
 * SCENARIO (default: "mature"):
 *   mature     → 12 mesi storico, persona "mature", 1 attention marker
 *   early      → 14 gg storico, persona "early" (< 30 daysActive)
 *   attention  → come mature + 3 marker "sotto range" (rosso ambra)
 *
 * IDEMPOTENTE: cancella prima TUTTI i record demo del paziente nelle
 * tabelle toccate (BiometricLog, TherapyItem/Intake, Appointment,
 * MedicalReport, CheckIn) → poi ricrea da zero. Sicuro da rieseguire.
 *
 * NON tocca: User.email/password (resta quello esistente, paziente continua
 * a loggarsi come prima), Subscription, GoogleAccount, AuditLog,
 * AiConversation. Solo i dati clinici demo.
 *
 * REQUISITI ENV:
 *   - DATABASE_URL o DIRECT_URL (connessione Postgres)
 *   - (Niente Supabase Auth: il paziente esiste già)
 *
 * REQUISITI DB:
 *   - Il paziente deve già esistere in `User` con `id = <userId>` e
 *     `role = "PATIENT"`.
 *   - Almeno 1 professionista (role MEDICO o COACH) nello stesso
 *     `organizationId` del paziente, usato come `professionalId` per
 *     Appointment + CheckIn + uploader MedicalReport.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// ── Env / production guard ────────────────────────────────────────────────

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("✖ DATABASE_URL / DIRECT_URL non settato.");
  process.exit(1);
}

const PROD_PROJECT_REF = "zzpzptvtshyetdpvwhfc";
const isProductionRef =
  connectionString.includes(`.${PROD_PROJECT_REF}`) ||
  connectionString.includes(`postgres.${PROD_PROJECT_REF}`);
const allowProd = process.env.SEED_DEMO_ALLOW_PRODUCTION === "1";

if (isProductionRef && !allowProd) {
  console.error(
    "\n✖ Seed-demo rifiutato: DIRECT_URL punta al Supabase di PRODUZIONE.\n" +
      "  Lo script sovrascrive dati clinici del paziente specificato.\n" +
      "  Per procedere: SEED_DEMO_ALLOW_PRODUCTION=1 npx tsx scripts/seed-demo-patient.ts ...\n",
  );
  process.exit(1);
}

// ── CLI args ──────────────────────────────────────────────────────────────

const [, , userIdArg, scenarioArg] = process.argv;

if (!userIdArg) {
  console.error(
    "Uso: npx tsx scripts/seed-demo-patient.ts <userId> [mature|early|attention]",
  );
  process.exit(1);
}

const userId = userIdArg.trim();
const scenario = (scenarioArg ?? "mature").toLowerCase();
if (!["mature", "early", "attention"].includes(scenario)) {
  console.error(`✖ Scenario sconosciuto: "${scenario}". Usa: mature | early | attention`);
  process.exit(1);
}

// UUID v4 sanity check (no SQL injection ma evita typo silenziosi)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!UUID_RE.test(userId)) {
  console.error(`✖ userId non è un UUID valido: ${userId}`);
  process.exit(1);
}

// ── Prisma ────────────────────────────────────────────────────────────────

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ── Helpers ───────────────────────────────────────────────────────────────

const daysAgo = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysFromNow = (n: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
};

// ── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n→ seed-demo-patient · userId=${userId} · scenario=${scenario}`);
  console.log(
    `  target: ${isProductionRef ? "PRODUCTION ⚠️" : "non-prod"}\n`,
  );

  // 1. Verifica esistenza paziente + recupera org
  const patient = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      organizationId: true,
      firstName: true,
    },
  });
  if (!patient) {
    console.error(`✖ Paziente con id=${userId} non trovato in User.`);
    process.exit(1);
  }
  if (patient.role !== "PATIENT") {
    console.error(
      `✖ User ${userId} ha role=${patient.role}, atteso PATIENT.`,
    );
    process.exit(1);
  }
  console.log(`✔ paziente: ${patient.email} (${patient.firstName ?? "—"})`);

  // 2. Trova professionista nella stessa org (per Appointment + CheckIn + uploader)
  const professional = await prisma.user.findFirst({
    where: {
      organizationId: patient.organizationId,
      role: { in: ["DOCTOR", "COACH", "ADMIN"] },
    },
    select: { id: true, role: true, email: true, fullName: true },
  });
  if (!professional) {
    console.error(
      `✖ Nessun professionista (DOCTOR/COACH/ADMIN) trovato in org=${patient.organizationId}.\n` +
        `  Lo script ha bisogno di almeno 1 utente staff per appointment/checkin/upload.`,
    );
    process.exit(1);
  }
  // ProfessionalRole enum su Appointment/CheckIn accetta solo DOCTOR|COACH.
  // Se professionista è ADMIN, fallback a DOCTOR (più appropriato per visite).
  const appointmentRole: "DOCTOR" | "COACH" =
    professional.role === "COACH" ? "COACH" : "DOCTOR";
  console.log(
    `✔ professionista: ${professional.email} (${professional.role} → ${appointmentRole})`,
  );

  // 3. Cleanup demo data esistente (idempotente)
  console.log("\n→ cleanup record esistenti (idempotenza)...");
  const deleted = await prisma.$transaction([
    prisma.therapyIntake.deleteMany({ where: { patientId: userId } }),
    prisma.therapyItem.deleteMany({ where: { patientId: userId } }),
    prisma.biometricLog.deleteMany({ where: { patientId: userId } }),
    prisma.appointment.deleteMany({ where: { patientId: userId } }),
    prisma.medicalReport.deleteMany({ where: { patientId: userId } }),
    prisma.checkIn.deleteMany({ where: { patientId: userId } }),
  ]);
  console.log(
    `  deleted: TherapyIntake=${deleted[0].count} TherapyItem=${deleted[1].count} ` +
      `Bio=${deleted[2].count} Appt=${deleted[3].count} Report=${deleted[4].count} CheckIn=${deleted[5].count}`,
  );

  // 4. Update User profile (completeness)
  console.log("\n→ update profilo paziente...");
  await prisma.user.update({
    where: { id: userId },
    data: {
      onboardingCompleted: true,
      heightCm: 178,
      sex: "MALE",
      birthDate: new Date("1992-07-15"),
      medicalConditions: "Ipertensione lieve in osservazione",
      allergies: "Nessuna nota",
      medications: "Tachipirina al bisogno",
      injuries: "Vecchia distorsione caviglia dx (2022)",
    },
  });
  console.log("  ✔ profilo aggiornato (completeness ~85%)");

  // 5. BiometricLog · giorni di storico in base allo scenario
  const bioDays = scenario === "early" ? 14 : 365;
  console.log(`\n→ creo BiometricLog × ${bioDays} giorni...`);
  const bioRecords = Array.from({ length: bioDays }).map((_, i) => {
    const date = daysAgo(bioDays - i);
    // Peso oscilla 80→82 con leggero trend "+",  BP stabile, sleep variabile, energia variabile
    const dayJitter = Math.sin(i / 7) * 0.5; // ~±0.5kg
    return {
      patientId: userId,
      date,
      weight: 80 + (i / bioDays) * 2 + dayJitter,
      systolicBP: 128 + Math.round(Math.sin(i / 5) * 6),
      diastolicBP: 82 + Math.round(Math.sin(i / 5) * 4),
      restingHR: 62 + Math.round(Math.sin(i / 3) * 4),
      sleepHours: 6.5 + Math.sin(i / 4) * 1.2,
      energyLevel: 7 + Math.round(Math.sin(i / 3) * 2), // 1-10
    };
  });
  await prisma.biometricLog.createMany({ data: bioRecords });
  console.log(`  ✔ ${bioRecords.length} log biometrici inseriti`);

  // 6. TherapyItem + TherapyIntake (ultimi 7 gg, 80% adherence)
  console.log("\n→ creo TherapyItem + TherapyIntake...");
  const therapies = await Promise.all([
    prisma.therapyItem.create({
      data: {
        patientId: userId,
        name: "Vitamina D 2000 UI",
        dose: "1 cps",
        frequency: "1 volta/die · mattina",
        kind: "PRESCRIBED",
        prescribedById: professional.id,
        startDate: daysAgo(60),
        active: true,
        notes: "Carenza moderata, ricontrollo fra 3 mesi.",
      },
    }),
    prisma.therapyItem.create({
      data: {
        patientId: userId,
        name: "Magnesio bisglicinato 300mg",
        dose: "1 cps",
        frequency: "1 volta/die · sera",
        kind: "SELF",
        startDate: daysAgo(30),
        active: true,
        notes: "Recovery + qualità sonno.",
      },
    }),
  ]);

  const intakes = therapies.flatMap((t) =>
    Array.from({ length: 7 }).map((_, i) => ({
      itemId: t.id,
      patientId: userId,
      date: daysAgo(7 - i),
      // 80% adherence randomizzata (i % 5 !== 0 → preso)
      taken: i % 5 !== 0,
      takenAt: i % 5 !== 0 ? daysAgo(7 - i) : null,
    })),
  );
  await prisma.therapyIntake.createMany({ data: intakes, skipDuplicates: true });
  console.log(
    `  ✔ ${therapies.length} terapie + ${intakes.length} intake (7 gg)`,
  );

  // 7. Appointment · prossima visita (5 giorni)
  console.log("\n→ creo Appointment futuro...");
  const apptStart = daysFromNow(5);
  apptStart.setHours(10, 0, 0, 0);
  const apptEnd = new Date(apptStart);
  apptEnd.setMinutes(apptEnd.getMinutes() + 30);
  await prisma.appointment.create({
    data: {
      patientId: userId,
      professionalId: professional.id,
      professionalRole: appointmentRole,
      startTime: apptStart,
      endTime: apptEnd,
      type: "VIDEO_CALL",
      status: "SCHEDULED",
      notes: "Visita di controllo · revisione pannello + biometrics ultimi 14 gg.",
    },
  });
  console.log(`  ✔ visita ${apptStart.toLocaleString("it-IT")}`);

  // 8. MedicalReport · pannello ematico recente
  console.log("\n→ creo MedicalReport...");
  const reportNotes =
    scenario === "attention"
      ? "Pannello androgeno: testosterone totale sotto range, SHBG da rivedere. " +
        "Pannello fegato: AST fuori range, da approfondire. " +
        "Pannello recovery: ferritina sotto range — supplementazione in corso."
      : scenario === "early"
        ? "Pannello base recente, valori in range. Riferimenti monitorati."
        : "Pannello androgeno: testosterone leggermente sotto range. " +
          "Vitamina D ancora sotto range, supplementazione in atto. " +
          "Tutti gli altri marker in range.";

  await prisma.medicalReport.create({
    data: {
      patientId: userId,
      uploadedById: professional.id,
      fileUrl: "https://example.com/demo-panel.pdf",
      fileName: `pannello-demo-${Date.now()}.pdf`,
      mimeType: "application/pdf",
      fileSize: 245678,
      category: "BLOOD_TEST",
      title: "Pannello ematico completo · demo",
      notes: reportNotes,
      issuedAt: daysAgo(7),
    },
  });
  console.log("  ✔ referto pannello ematico (7 gg fa)");

  // 9. CheckIn · 1 reviewed + 1 pending in scadenza
  console.log("\n→ creo CheckIn...");
  await prisma.checkIn.createMany({
    data: [
      {
        patientId: userId,
        professionalId: professional.id,
        professionalRole: appointmentRole,
        date: daysAgo(7),
        weight: 80.4,
        rating: 8,
        notes: "Settimana stabile, recovery buona.",
        professionalFeedback: "Procediamo come da piano. Continua così.",
        status: "REVIEWED",
      },
      {
        patientId: userId,
        professionalId: professional.id,
        professionalRole: appointmentRole,
        date: daysFromNow(3),
        status: "PENDING",
      },
    ],
  });
  console.log("  ✔ 1 reviewed (7 gg fa) + 1 pending (in scadenza 3 gg)");

  console.log("\n✓ Demo data popolata con successo.");
  console.log(`  Apri https://my.salutediferro.com/dashboard/patient/agente`);
  console.log(`  loggandoti come ${patient.email}`);
}

main()
  .catch((err) => {
    console.error("\n✖ seed-demo-patient FAILED:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
