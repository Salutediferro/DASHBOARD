import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import {
  PrismaClient,
  UserRole,
  Difficulty,
  WorkoutType,
  MuscleGroup,
  Equipment,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createClient, type User as SupabaseAuthUser } from "@supabase/supabase-js";
import { EXERCISES_SEED } from "../src/lib/data/exercises-seed";

// ------------------------------------------------------------
// Seed Prompt 2 — solo modulo Workout, idempotente.
// - 1 Organization "SDF Beta"
// - 1 Coach + 2 Client su Supabase Auth + Prisma User (UUID condiviso)
// - Libreria esercizi globale (da EXERCISES_SEED)
// - 2 template workout demo (Upper A - Forza, Lower A - Forza)
// - 1 WorkoutAssignment attivo: Marco Rossi ← Upper A - Forza
// ------------------------------------------------------------

const SEED_PASSWORD = "SdfBeta2026!";

type SeedUserSpec = {
  email: string;
  fullName: string;
  role: UserRole;
};

const COACH: SeedUserSpec = {
  email: "coach@sdf.local",
  fullName: "Luca Coach",
  role: UserRole.COACH,
};

const CLIENT_1: SeedUserSpec = {
  email: "cliente1@sdf.local",
  fullName: "Marco Rossi",
  role: UserRole.CLIENT,
};

const CLIENT_2: SeedUserSpec = {
  email: "cliente2@sdf.local",
  fullName: "Giulia Bianchi",
  role: UserRole.CLIENT,
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Seed: mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local",
  );
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

// ------------------------------------------------------------
// Helpers
// ------------------------------------------------------------

async function findAuthUserByEmail(email: string): Promise<SupabaseAuthUser | null> {
  // paginato: tre coach è peanuts ma il loop è corretto per il futuro
  const perPage = 200;
  let page = 1;
  while (true) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers: ${error.message}`);
    const hit = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (hit) return hit;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

async function ensureSupabaseAuthUser(spec: SeedUserSpec): Promise<string> {
  const existing = await findAuthUserByEmail(spec.email);
  if (existing) {
    // Assicura che la password sia quella di seed (riallineamento idempotente su ambiente dev).
    const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
      password: SEED_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: spec.fullName, role: spec.role },
      app_metadata: { role: spec.role },
    });
    if (error) throw new Error(`updateUserById(${spec.email}): ${error.message}`);
    return existing.id;
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: spec.email,
    password: SEED_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: spec.fullName, role: spec.role },
    app_metadata: { role: spec.role },
  });
  if (error || !data.user) {
    throw new Error(`createUser(${spec.email}): ${error?.message ?? "no user returned"}`);
  }
  return data.user.id;
}

async function upsertPrismaUser(
  authId: string,
  spec: SeedUserSpec,
  organizationId: string,
) {
  return prisma.user.upsert({
    where: { email: spec.email },
    update: {
      id: authId, // allinea se esiste già con id diverso
      fullName: spec.fullName,
      role: spec.role,
      organizationId,
      onboardingCompleted: true,
    },
    create: {
      id: authId,
      email: spec.email,
      fullName: spec.fullName,
      role: spec.role,
      organizationId,
      onboardingCompleted: true,
    },
  });
}

type TemplateDef = {
  name: string;
  description: string;
  difficulty: Difficulty;
  type: WorkoutType;
  tags: string[];
  day: {
    dayNumber: number;
    name: string;
    exercises: Array<{
      slug: string;
      sets: number;
      reps: string;
      restSeconds: number;
    }>;
  };
};

const UPPER_A: TemplateDef = {
  name: "Upper A - Forza",
  description: "Seduta upper body orientata alla forza su panca, rematore e military press.",
  difficulty: Difficulty.INTERMEDIATE,
  type: WorkoutType.STRENGTH,
  tags: ["upper", "forza", "demo"],
  day: {
    dayNumber: 1,
    name: "Upper A",
    exercises: [
      { slug: "bench-press", sets: 4, reps: "5", restSeconds: 180 },
      { slug: "barbell-row", sets: 4, reps: "6", restSeconds: 150 },
      { slug: "military-press", sets: 3, reps: "8", restSeconds: 120 },
      { slug: "pull-up", sets: 3, reps: "max", restSeconds: 120 },
      { slug: "barbell-curl", sets: 3, reps: "10", restSeconds: 90 },
    ],
  },
};

const LOWER_A: TemplateDef = {
  name: "Lower A - Forza",
  description: "Seduta lower body orientata alla forza su squat e stacco rumeno.",
  difficulty: Difficulty.INTERMEDIATE,
  type: WorkoutType.STRENGTH,
  tags: ["lower", "forza", "demo"],
  day: {
    dayNumber: 1,
    name: "Lower A",
    exercises: [
      { slug: "back-squat", sets: 5, reps: "5", restSeconds: 180 },
      { slug: "romanian-deadlift", sets: 4, reps: "8", restSeconds: 150 },
      { slug: "leg-press", sets: 3, reps: "12", restSeconds: 120 },
      { slug: "leg-curl", sets: 3, reps: "12", restSeconds: 90 },
      { slug: "calf-raise-standing", sets: 4, reps: "15", restSeconds: 60 },
    ],
  },
};

async function upsertTemplate(
  coachId: string,
  organizationId: string,
  def: TemplateDef,
  exerciseIdBySlug: Map<string, string>,
): Promise<string> {
  // idempotenza: (coachId, name) è la chiave naturale scelta nel Prompt 2
  const existing = await prisma.workoutTemplate.findFirst({
    where: { coachId, name: def.name },
    select: { id: true },
  });

  if (existing) {
    return existing.id;
  }

  const exercisesCreate = def.day.exercises.map((e, idx) => {
    const exerciseId = exerciseIdBySlug.get(e.slug);
    if (!exerciseId) {
      throw new Error(
        `Template "${def.name}": esercizio con slug "${e.slug}" non trovato in EXERCISES_SEED`,
      );
    }
    return {
      exerciseId,
      orderIndex: idx + 1,
      sets: e.sets,
      reps: e.reps,
      restSeconds: e.restSeconds,
    };
  });

  const created = await prisma.workoutTemplate.create({
    data: {
      coachId,
      organizationId,
      name: def.name,
      description: def.description,
      difficulty: def.difficulty,
      type: def.type,
      tags: def.tags,
      days: {
        create: [
          {
            dayNumber: def.day.dayNumber,
            name: def.day.name,
            exercises: { create: exercisesCreate },
          },
        ],
      },
    },
    select: { id: true },
  });
  return created.id;
}

// ------------------------------------------------------------
// Main
// ------------------------------------------------------------

async function main() {
  // 1) Organization
  const org = await prisma.organization.upsert({
    where: { slug: "sdf-beta" },
    update: { name: "SDF Beta" },
    create: {
      name: "SDF Beta",
      slug: "sdf-beta",
      primaryColor: "#0A0A0A",
      secondaryColor: "#C9A96E",
    },
  });
  console.log(`✓ Organization creata: ${org.name}`);

  // 2) Users — Supabase Auth + Prisma User con UUID condiviso
  const coachAuthId = await ensureSupabaseAuthUser(COACH);
  const coach = await upsertPrismaUser(coachAuthId, COACH, org.id);
  console.log(`✓ Coach creato: ${COACH.email} (${COACH.fullName})`);

  const client1AuthId = await ensureSupabaseAuthUser(CLIENT_1);
  const client1 = await upsertPrismaUser(client1AuthId, CLIENT_1, org.id);
  console.log(`✓ Client 1 creato: ${CLIENT_1.email} (${CLIENT_1.fullName})`);

  const client2AuthId = await ensureSupabaseAuthUser(CLIENT_2);
  const client2 = await upsertPrismaUser(client2AuthId, CLIENT_2, org.id);
  console.log(`✓ Client 2 creato: ${CLIENT_2.email} (${CLIENT_2.fullName})`);

  // 3) CoachClient relations
  for (const c of [client1, client2]) {
    await prisma.coachClient.upsert({
      where: { coachId_clientId: { coachId: coach.id, clientId: c.id } },
      update: { status: "ACTIVE" },
      create: { coachId: coach.id, clientId: c.id },
    });
  }
  console.log(`✓ Relazioni coach→client allineate (${coach.fullName} ↔ 2 client)`);

  // 4) Exercise library — upsert per slug
  const exerciseIdBySlug = new Map<string, string>();
  for (const ex of EXERCISES_SEED) {
    const data = {
      name: ex.name,
      nameIt: ex.nameIt,
      slug: ex.slug,
      muscleGroup: ex.muscleGroup as MuscleGroup,
      secondaryMuscles: ex.secondaryMuscles as MuscleGroup[],
      equipment: ex.equipment as Equipment,
      description: ex.description,
      steps: ex.steps,
      tips: ex.tips,
      commonMistakes: ex.commonMistakes,
      variants: ex.variants,
      isGlobal: true,
    };
    const upserted = await prisma.exercise.upsert({
      where: { slug: ex.slug },
      update: data,
      create: data,
      select: { id: true, slug: true },
    });
    exerciseIdBySlug.set(upserted.slug, upserted.id);
  }
  console.log(`✓ ${exerciseIdBySlug.size} esercizi caricati`);

  // 5) Template demo
  const upperId = await upsertTemplate(coach.id, org.id, UPPER_A, exerciseIdBySlug);
  console.log(`✓ Template '${UPPER_A.name}' pronto con ${UPPER_A.day.exercises.length} esercizi`);
  await upsertTemplate(coach.id, org.id, LOWER_A, exerciseIdBySlug);
  console.log(`✓ Template '${LOWER_A.name}' pronto con ${LOWER_A.day.exercises.length} esercizi`);

  // 6) WorkoutAssignment — Marco riceve Upper A, Giulia nulla
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  await prisma.workoutAssignment.upsert({
    where: {
      clientId_templateId_startDate: {
        clientId: client1.id,
        templateId: upperId,
        startDate,
      },
    },
    update: { isActive: true, coachId: coach.id },
    create: {
      coachId: coach.id,
      clientId: client1.id,
      templateId: upperId,
      startDate,
      isActive: true,
    },
  });
  console.log(
    `✓ Assegnazione: ${UPPER_A.name} → ${CLIENT_1.fullName} dal ${startDate.toISOString().slice(0, 10)}`,
  );
  console.log(`ℹ ${CLIENT_2.fullName} lasciata senza workout attivo (empty-state voluto)`);

  // Riepilogo conteggi
  const [orgCount, userCount, exerciseCount, templateCount, assignmentCount] =
    await Promise.all([
      prisma.organization.count(),
      prisma.user.count(),
      prisma.exercise.count(),
      prisma.workoutTemplate.count(),
      prisma.workoutAssignment.count(),
    ]);

  console.log("");
  console.log("=== CONTEGGI DOPO SEED ===");
  console.log(`Organization:      ${orgCount}`);
  console.log(`User:              ${userCount}`);
  console.log(`Exercise:          ${exerciseCount}`);
  console.log(`WorkoutTemplate:   ${templateCount}`);
  console.log(`WorkoutAssignment: ${assignmentCount}`);

  console.log("");
  console.log("=== CREDENZIALI DI SEED ===");
  console.log(`Coach:     ${COACH.email}    / ${SEED_PASSWORD}`);
  console.log(`Client 1:  ${CLIENT_1.email} / ${SEED_PASSWORD}  (ha workout assegnato)`);
  console.log(`Client 2:  ${CLIENT_2.email} / ${SEED_PASSWORD}  (senza workout)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
