import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import {
  PrismaClient,
  type ProfessionalRole,
  type UserRole,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient, type User as AuthUser } from "@supabase/supabase-js";

// ── Env / clients ─────────────────────────────────────────────────────────
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL / DIRECT_URL is not set");
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Set SUPABASE_SERVICE_ROLE_KEY (and NEXT_PUBLIC_SUPABASE_URL) in .env.local to seed auth users",
  );
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── Constants ─────────────────────────────────────────────────────────────
const SEED_PASSWORD = "Password123!";
const TEST_EMAIL_DOMAINS = ["@salutediferro.test", "@test.local"];

// ── Helpers ───────────────────────────────────────────────────────────────
const timeOfDay = (hh: number, mm = 0) =>
  new Date(Date.UTC(1970, 0, 1, hh, mm, 0));

const daysFromNow = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setSeconds(0, 0);
  return d;
};

function isTestEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return TEST_EMAIL_DOMAINS.some((d) => email.endsWith(d));
}

/**
 * List every Supabase auth user whose email matches our test domains,
 * paging through the admin API until we reach the end.
 */
async function listTestAuthUsers(): Promise<AuthUser[]> {
  const out: AuthUser[] = [];
  let page = 1;
  const perPage = 1000;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) if (isTestEmail(u.email)) out.push(u);
    if (users.length < perPage) break;
    page += 1;
  }
  return out;
}

/**
 * Create a Supabase auth user. If the email is already registered (e.g. a
 * stray record survived the cleanup step) delete it once and retry.
 */
async function createAuthUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}): Promise<AuthUser | null> {
  const attempt = () =>
    supabaseAdmin.auth.admin.createUser({
      email: input.email,
      password: SEED_PASSWORD,
      email_confirm: true,
      app_metadata: { role: input.role },
      user_metadata: { firstName: input.firstName, lastName: input.lastName },
    });

  let { data, error } = await attempt();
  if (error && /already.*(registered|exists)/i.test(error.message)) {
    const stale = (await listTestAuthUsers()).find(
      (u) => u.email === input.email,
    );
    if (stale) {
      await supabaseAdmin.auth.admin.deleteUser(stale.id);
    }
    ({ data, error } = await attempt());
  }
  if (error || !data?.user) {
    console.error(
      `  ⚠ Failed to create auth user ${input.email}: ${error?.message ?? "unknown"}`,
    );
    return null;
  }
  return data.user;
}

// ── Main ──────────────────────────────────────────────────────────────────
type UserSpec = {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  sex?: "MALE" | "FEMALE" | "OTHER";
  birthDate?: Date;
  heightCm?: number;
  phone?: string;
  taxCode?: string;
  emergencyContact?: string;
  medicalConditions?: string;
  allergies?: string;
  medications?: string;
  injuries?: string;
};

async function main() {
  console.log("🌱 Seeding health-service database...");

  // ── 1. Auth cleanup ─────────────────────────────────────────────────────
  const stale = await listTestAuthUsers();
  for (const u of stale) {
    await supabaseAdmin.auth.admin.deleteUser(u.id);
  }
  console.log(`  ✓ Cleaned up ${stale.length} stale auth users`);

  // ── 2. Prisma cleanup (cascades) ────────────────────────────────────────
  // Delete every User row for the test domains; CareRelationship,
  // BiometricLog, MedicalReport, Appointment, AvailabilitySlot all cascade
  // via onDelete: Cascade from the FK.
  const deletedUsers = await prisma.user.deleteMany({
    where: {
      OR: TEST_EMAIL_DOMAINS.map((d) => ({ email: { endsWith: d } })),
    },
  });
  console.log(`  ✓ Deleted ${deletedUsers.count} stale Prisma users (cascade)`);

  // ── 3. Organization ─────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "salute-di-ferro" },
    update: { name: "Salute di Ferro Clinic" },
    create: {
      name: "Salute di Ferro Clinic",
      slug: "salute-di-ferro",
      primaryColor: "#c9a96e",
      secondaryColor: "#1a1a1a",
    },
  });
  console.log(`  ✓ Organization: ${org.name}`);

  // ── 4. Users (auth first, then Prisma with the auth id) ────────────────
  const adminSpec: UserSpec = {
    email: "admin@salutediferro.test",
    firstName: "Admin",
    lastName: "Sistema",
    role: "ADMIN",
  };

  const doctorSpecs: UserSpec[] = [
    {
      email: "dott.rossi@salutediferro.test",
      firstName: "Giulia",
      lastName: "Rossi",
      role: "DOCTOR",
      phone: "+39 02 000 0000",
    },
    {
      email: "dott.bianchi@salutediferro.test",
      firstName: "Marco",
      lastName: "Bianchi",
      role: "DOCTOR",
      phone: "+39 02 000 0000",
    },
  ];

  const coachSpecs: UserSpec[] = [
    {
      email: "coach.ferri@salutediferro.test",
      firstName: "Luca",
      lastName: "Ferri",
      role: "COACH",
      phone: "+39 02 111 1111",
    },
    {
      email: "coach.greco@salutediferro.test",
      firstName: "Sara",
      lastName: "Greco",
      role: "COACH",
      phone: "+39 02 111 1111",
    },
  ];

  const patientSpecs: UserSpec[] = [
    {
      email: "paziente1@test.local",
      firstName: "Alessandro",
      lastName: "Conti",
      role: "PATIENT",
      sex: "MALE",
      birthDate: new Date(1980, 2, 15),
      heightCm: 178,
      phone: "+39 333 000 0001",
      taxCode: "TESTPT00000000001",
      emergencyContact: "Mario Contatto +39 333 111 2222",
      medicalConditions: "Controllo pressione arteriosa",
      allergies: "Pollini, acari",
      medications: "Ramipril 5mg",
    },
    {
      email: "paziente2@test.local",
      firstName: "Francesca",
      lastName: "Marino",
      role: "PATIENT",
      sex: "FEMALE",
      birthDate: new Date(1983, 2, 15),
      heightCm: 165,
      phone: "+39 333 000 0002",
      taxCode: "TESTPT00000000002",
      emergencyContact: "Mario Contatto +39 333 111 2222",
      medicalConditions: "Monitoraggio post-operatorio",
    },
    {
      email: "paziente3@test.local",
      firstName: "Davide",
      lastName: "Russo",
      role: "PATIENT",
      sex: "MALE",
      birthDate: new Date(1986, 2, 15),
      heightCm: 182,
      phone: "+39 333 000 0003",
      taxCode: "TESTPT00000000003",
      emergencyContact: "Mario Contatto +39 333 111 2222",
      medicalConditions: "Diabete tipo 2",
      allergies: "Pollini, acari",
    },
    {
      email: "paziente4@test.local",
      firstName: "Giorgia",
      lastName: "Esposito",
      role: "PATIENT",
      sex: "FEMALE",
      birthDate: new Date(1989, 2, 15),
      heightCm: 170,
      phone: "+39 333 000 0004",
      taxCode: "TESTPT00000000004",
      emergencyContact: "Mario Contatto +39 333 111 2222",
      medicalConditions: "Prevenzione cardiovascolare",
    },
    {
      email: "paziente5@test.local",
      firstName: "Matteo",
      lastName: "Galli",
      role: "PATIENT",
      sex: "MALE",
      birthDate: new Date(1992, 2, 15),
      heightCm: 175,
      phone: "+39 333 000 0005",
      taxCode: "TESTPT00000000005",
      emergencyContact: "Mario Contatto +39 333 111 2222",
      medicalConditions: "Recupero infortunio ginocchio",
      allergies: "Pollini, acari",
    },
  ];

  /**
   * Create the auth user first and mirror the resulting id into Prisma.
   * Returns null for specs that failed at the auth step (already logged).
   */
  async function provisionUser(spec: UserSpec) {
    const authUser = await createAuthUser({
      email: spec.email,
      firstName: spec.firstName,
      lastName: spec.lastName,
      role: spec.role,
    });
    if (!authUser) return null;

    const fullName =
      spec.role === "DOCTOR"
        ? `Dr. ${spec.firstName} ${spec.lastName}`
        : `${spec.firstName} ${spec.lastName}`;

    return prisma.user.create({
      data: {
        id: authUser.id,
        email: spec.email,
        fullName,
        firstName: spec.firstName,
        lastName: spec.lastName,
        sex: spec.sex ?? null,
        birthDate: spec.birthDate ?? null,
        heightCm: spec.heightCm ?? null,
        phone: spec.phone ?? null,
        taxCode: spec.taxCode ?? null,
        emergencyContact: spec.emergencyContact ?? null,
        role: spec.role,
        organizationId: org.id,
        onboardingCompleted: true,
        medicalConditions: spec.medicalConditions ?? null,
        allergies: spec.allergies ?? null,
        medications: spec.medications ?? null,
        injuries: spec.injuries ?? null,
      },
    });
  }

  const admin = await provisionUser(adminSpec);
  const doctors = (
    await Promise.all(doctorSpecs.map(provisionUser))
  ).filter((u): u is NonNullable<typeof u> => u !== null);
  const coaches = (
    await Promise.all(coachSpecs.map(provisionUser))
  ).filter((u): u is NonNullable<typeof u> => u !== null);
  const patients = (
    await Promise.all(patientSpecs.map(provisionUser))
  ).filter((u): u is NonNullable<typeof u> => u !== null);

  if (!admin) {
    throw new Error("Failed to provision admin user — aborting seed");
  }

  const createdTotal =
    1 + doctors.length + coaches.length + patients.length;
  console.log(
    `  ✓ Users: 1 admin, ${doctors.length} doctors, ${coaches.length} coaches, ${patients.length} patients`,
  );

  // ── 5. CareRelationships ────────────────────────────────────────────────
  const relRows: {
    professional: (typeof doctors)[number];
    patient: (typeof patients)[number];
    role: ProfessionalRole;
  }[] = [];
  patients.forEach((pt, i) => {
    relRows.push({
      professional: doctors[i % doctors.length]!,
      patient: pt,
      role: "DOCTOR",
    });
    relRows.push({
      professional: coaches[i % coaches.length]!,
      patient: pt,
      role: "COACH",
    });
  });
  for (const r of relRows) {
    await prisma.careRelationship.create({
      data: {
        professionalId: r.professional.id,
        patientId: r.patient.id,
        professionalRole: r.role,
        notes: `Seed relationship ${r.role.toLowerCase()}`,
      },
    });
  }
  console.log(`  ✓ CareRelationships: ${relRows.length}`);

  // ── 6. BiometricLogs ────────────────────────────────────────────────────
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

  // ── 7. MedicalReports ───────────────────────────────────────────────────
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

  // ── 8. Appointments ─────────────────────────────────────────────────────
  for (let i = 0; i < patients.length; i++) {
    const pt = patients[i]!;
    const doc = doctors[i % doctors.length]!;
    const coach = coaches[i % coaches.length]!;

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

    const pastDocStart = daysFromNow(-14 - i);
    pastDocStart.setHours(10, 0, 0, 0);
    await prisma.appointment.create({
      data: {
        professionalId: doc.id,
        patientId: pt.id,
        professionalRole: "DOCTOR",
        startTime: pastDocStart,
        endTime: new Date(pastDocStart.getTime() + 30 * 60000),
        type: "FOLLOW_UP",
        status: "COMPLETED",
        notes: "Controllo clinico completato",
      },
    });

    const pastCoachStart = daysFromNow(-7 - i);
    pastCoachStart.setHours(17, 0, 0, 0);
    await prisma.appointment.create({
      data: {
        professionalId: coach.id,
        patientId: pt.id,
        professionalRole: "COACH",
        startTime: pastCoachStart,
        endTime: new Date(pastCoachStart.getTime() + 45 * 60000),
        type: "COACHING_SESSION",
        status: "COMPLETED",
        meetingUrl: "https://meet.example.com/demo",
      },
    });
  }
  console.log(
    `  ✓ Appointments: ${patients.length * 4} (2 future + 2 past per patient)`,
  );

  // ── 9. AvailabilitySlots ────────────────────────────────────────────────
  const professionals = [...doctors, ...coaches];
  for (const pro of professionals) {
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
  console.log(`✓ Created ${createdTotal} auth users, password: ${SEED_PASSWORD}`);
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
