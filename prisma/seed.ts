import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { PrismaClient, type ProfessionalRole } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL / DIRECT_URL is not set");
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// Epoch-based helper so AvailabilitySlot @db.Time gets a sane time-of-day.
const timeOfDay = (hh: number, mm = 0) =>
  new Date(Date.UTC(1970, 0, 1, hh, mm, 0));

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setSeconds(0, 0);
  return d;
};

async function main() {
  console.log("🌱 Seeding health-service database...");

  // ---- Organization --------------------------------------------------------
  const org = await prisma.organization.upsert({
    where: { slug: "salute-di-ferro" },
    update: {},
    create: {
      name: "Salute di Ferro",
      slug: "salute-di-ferro",
      primaryColor: "#c9a96e",
      secondaryColor: "#1a1a1a",
    },
  });
  console.log(`  ✓ Organization: ${org.name}`);

  // ---- Users ---------------------------------------------------------------
  const admin = await prisma.user.upsert({
    where: { email: "admin@salutediferro.test" },
    update: {},
    create: {
      email: "admin@salutediferro.test",
      fullName: "Admin Sistema",
      firstName: "Admin",
      lastName: "Sistema",
      role: "ADMIN",
      organizationId: org.id,
      onboardingCompleted: true,
    },
  });

  const doctors = await Promise.all(
    [
      { email: "dott.rossi@salutediferro.test", first: "Giulia", last: "Rossi" },
      { email: "dott.bianchi@salutediferro.test", first: "Marco", last: "Bianchi" },
    ].map((d) =>
      prisma.user.upsert({
        where: { email: d.email },
        update: {},
        create: {
          email: d.email,
          fullName: `Dr. ${d.first} ${d.last}`,
          firstName: d.first,
          lastName: d.last,
          role: "DOCTOR",
          organizationId: org.id,
          onboardingCompleted: true,
          phone: "+39 02 000 0000",
        },
      }),
    ),
  );

  const coaches = await Promise.all(
    [
      { email: "coach.ferri@salutediferro.test", first: "Luca", last: "Ferri" },
      { email: "coach.greco@salutediferro.test", first: "Sara", last: "Greco" },
    ].map((c) =>
      prisma.user.upsert({
        where: { email: c.email },
        update: {},
        create: {
          email: c.email,
          fullName: `${c.first} ${c.last}`,
          firstName: c.first,
          lastName: c.last,
          role: "COACH",
          organizationId: org.id,
          onboardingCompleted: true,
          phone: "+39 02 111 1111",
        },
      }),
    ),
  );

  const patientSpecs = [
    { email: "paziente1@test.local", first: "Alessandro", last: "Conti", sex: "MALE" as const, height: 178, goal: "Controllo pressione arteriosa" },
    { email: "paziente2@test.local", first: "Francesca", last: "Marino", sex: "FEMALE" as const, height: 165, goal: "Monitoraggio post-operatorio" },
    { email: "paziente3@test.local", first: "Davide", last: "Russo", sex: "MALE" as const, height: 182, goal: "Diabete tipo 2" },
    { email: "paziente4@test.local", first: "Giorgia", last: "Esposito", sex: "FEMALE" as const, height: 170, goal: "Prevenzione cardiovascolare" },
    { email: "paziente5@test.local", first: "Matteo", last: "Galli", sex: "MALE" as const, height: 175, goal: "Recupero infortunio ginocchio" },
  ];

  const patients = await Promise.all(
    patientSpecs.map((p, i) =>
      prisma.user.upsert({
        where: { email: p.email },
        update: {},
        create: {
          email: p.email,
          fullName: `${p.first} ${p.last}`,
          firstName: p.first,
          lastName: p.last,
          sex: p.sex,
          birthDate: new Date(1980 + i * 3, 2, 15),
          heightCm: p.height,
          phone: `+39 333 000 000${i + 1}`,
          taxCode: `TESTPT${String(i + 1).padStart(11, "0")}`,
          emergencyContact: "Mario Contatto +39 333 111 2222",
          role: "PATIENT",
          organizationId: org.id,
          onboardingCompleted: true,
          medicalConditions: p.goal,
          allergies: i % 2 === 0 ? "Pollini, acari" : null,
          medications: i % 3 === 0 ? "Ramipril 5mg" : null,
          injuries: null,
        },
      }),
    ),
  );
  console.log(
    `  ✓ Users: 1 admin, ${doctors.length} doctors, ${coaches.length} coaches, ${patients.length} patients`,
  );

  // ---- CareRelationships ---------------------------------------------------
  // Each patient gets one primary doctor and one primary coach (round-robin).
  const relRows: { professional: typeof doctors[number]; patient: typeof patients[number]; role: ProfessionalRole }[] = [];
  patients.forEach((pt, i) => {
    relRows.push({ professional: doctors[i % doctors.length]!, patient: pt, role: "DOCTOR" });
    relRows.push({ professional: coaches[i % coaches.length]!, patient: pt, role: "COACH" });
  });
  for (const r of relRows) {
    await prisma.careRelationship.upsert({
      where: {
        professionalId_patientId_professionalRole: {
          professionalId: r.professional.id,
          patientId: r.patient.id,
          professionalRole: r.role,
        },
      },
      update: {},
      create: {
        professionalId: r.professional.id,
        patientId: r.patient.id,
        professionalRole: r.role,
        notes: `Seed relationship ${r.role.toLowerCase()}`,
      },
    });
  }
  console.log(`  ✓ CareRelationships: ${relRows.length}`);

  // ---- BiometricLogs (2-3 per patient) ------------------------------------
  // Delete any existing to keep seed deterministic.
  await prisma.biometricLog.deleteMany({
    where: { patientId: { in: patients.map((p) => p.id) } },
  });
  for (const pt of patients) {
    const baseWeight = 60 + Math.random() * 30;
    for (let i = 0; i < 3; i++) {
      const weight = Number((baseWeight - i * 0.4).toFixed(1));
      const heightM = (pt.heightCm ?? 170) / 100;
      await prisma.biometricLog.create({
        data: {
          patientId: pt.id,
          date: daysFromNow(-i * 7),
          weight,
          bmi: Number((weight / (heightM * heightM)).toFixed(1)),
          systolicBP: 115 + Math.floor(Math.random() * 20),
          diastolicBP: 70 + Math.floor(Math.random() * 15),
          restingHR: 60 + Math.floor(Math.random() * 20),
          glucoseFasting: 85 + Math.random() * 15,
          sleepHours: 6 + Math.random() * 2,
          steps: 4000 + Math.floor(Math.random() * 6000),
          energyLevel: 5 + Math.floor(Math.random() * 5),
        },
      });
    }
  }
  console.log(`  ✓ BiometricLogs: ${patients.length * 3}`);

  // ---- MedicalReports (1-2 per patient) ------------------------------------
  await prisma.medicalReport.deleteMany({
    where: { patientId: { in: patients.map((p) => p.id) } },
  });
  for (const pt of patients) {
    await prisma.medicalReport.create({
      data: {
        patientId: pt.id,
        uploadedById: pt.id,
        fileUrl: `seed/placeholder/${pt.id}-emocromo.pdf`,
        fileName: "Emocromo completo.pdf",
        mimeType: "application/pdf",
        fileSize: 128_000,
        category: "BLOOD_TEST",
        title: "Emocromo completo",
        notes: "Esami di routine",
        issuedAt: daysFromNow(-30),
      },
    });
    await prisma.medicalReport.create({
      data: {
        patientId: pt.id,
        uploadedById: pt.id,
        fileUrl: `seed/placeholder/${pt.id}-visita.pdf`,
        fileName: "Relazione visita.pdf",
        mimeType: "application/pdf",
        fileSize: 64_000,
        category: "GENERAL_VISIT",
        title: "Visita medica generale",
        issuedAt: daysFromNow(-60),
      },
    });
  }
  console.log(`  ✓ MedicalReports: ${patients.length * 2}`);

  // ---- Appointments --------------------------------------------------------
  await prisma.appointment.deleteMany({
    where: { patientId: { in: patients.map((p) => p.id) } },
  });
  for (let i = 0; i < patients.length; i++) {
    const pt = patients[i]!;
    const doc = doctors[i % doctors.length]!;
    const coach = coaches[i % coaches.length]!;
    // Doctor visit in +3..+7 days
    const docStart = daysFromNow(3 + i);
    docStart.setHours(10, 0, 0, 0);
    await prisma.appointment.create({
      data: {
        professionalId: doc.id,
        patientId: pt.id,
        professionalRole: "DOCTOR",
        startTime: docStart,
        endTime: new Date(docStart.getTime() + 30 * 60000),
        type: "VISIT",
        status: "SCHEDULED",
        notes: "Follow-up trimestrale",
      },
    });
    // Coaching session in +1..+5 days
    const coachStart = daysFromNow(1 + i);
    coachStart.setHours(17, 0, 0, 0);
    await prisma.appointment.create({
      data: {
        professionalId: coach.id,
        patientId: pt.id,
        professionalRole: "COACH",
        startTime: coachStart,
        endTime: new Date(coachStart.getTime() + 45 * 60000),
        type: "COACHING_SESSION",
        status: "SCHEDULED",
        meetingUrl: "https://meet.example.com/demo",
      },
    });
  }
  console.log(`  ✓ Appointments: ${patients.length * 2}`);

  // ---- AvailabilitySlots ---------------------------------------------------
  const professionals = [...doctors, ...coaches];
  await prisma.availabilitySlot.deleteMany({
    where: { professionalId: { in: professionals.map((p) => p.id) } },
  });
  for (const pro of professionals) {
    // Mon–Fri (1..5), one 09:00-13:00 and one 14:00-18:00 recurring slot
    for (let dow = 1; dow <= 5; dow++) {
      await prisma.availabilitySlot.create({
        data: {
          professionalId: pro.id,
          dayOfWeek: dow,
          date: null,
          startTime: timeOfDay(9, 0),
          endTime: timeOfDay(13, 0),
          isRecurring: true,
        },
      });
      await prisma.availabilitySlot.create({
        data: {
          professionalId: pro.id,
          dayOfWeek: dow,
          date: null,
          startTime: timeOfDay(14, 0),
          endTime: timeOfDay(18, 0),
          isRecurring: true,
        },
      });
    }
  }
  console.log(`  ✓ AvailabilitySlots: ${professionals.length * 10}`);

  console.log("✅ Seed completato");
  console.log("");
  console.log("Test accounts (email → role):");
  console.log(`  ${admin.email} → ADMIN`);
  doctors.forEach((d) => console.log(`  ${d.email} → DOCTOR`));
  coaches.forEach((c) => console.log(`  ${c.email} → COACH`));
  patients.forEach((p) => console.log(`  ${p.email} → PATIENT`));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
