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
import { EXERCISES_SEED } from "../src/lib/data/exercises-seed";

const adapter = new PrismaPg({
  connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // 1) Organization
  const org = await prisma.organization.upsert({
    where: { slug: "salute-di-ferro" },
    update: {},
    create: {
      name: "Salute di Ferro",
      slug: "salute-di-ferro",
      primaryColor: "#0A0A0A",
      secondaryColor: "#C9A96E",
    },
  });

  // 2) Users: 1 coach + 2 clients
  const coach = await prisma.user.upsert({
    where: { email: "coach@saluteferro.it" },
    update: {},
    create: {
      email: "coach@saluteferro.it",
      fullName: "Marco Ferri",
      role: UserRole.COACH,
      organizationId: org.id,
      onboardingCompleted: true,
    },
  });

  const client1 = await prisma.user.upsert({
    where: { email: "luca@example.com" },
    update: {},
    create: {
      email: "luca@example.com",
      fullName: "Luca Bianchi",
      role: UserRole.CLIENT,
      organizationId: org.id,
      onboardingCompleted: true,
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: "sara@example.com" },
    update: {},
    create: {
      email: "sara@example.com",
      fullName: "Sara Rossi",
      role: UserRole.CLIENT,
      organizationId: org.id,
      onboardingCompleted: true,
    },
  });

  // 3) Coach-client relations
  for (const c of [client1, client2]) {
    await prisma.coachClient.upsert({
      where: { coachId_clientId: { coachId: coach.id, clientId: c.id } },
      update: {},
      create: { coachId: coach.id, clientId: c.id },
    });
  }

  // 4) Exercise library (globals) — 78 esercizi con contenuti completi in italiano
  // Video placeholder stock: sostituire via UI "Carica video" nel modal dettaglio
  const STOCK_VIDEO_URL =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
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
      videoUrl: STOCK_VIDEO_URL,
      isGlobal: true,
    };
    await prisma.exercise.upsert({
      where: { slug: ex.slug },
      update: data,
      create: data,
    });
  }
  console.log(`✅ ${EXERCISES_SEED.length} esercizi upsertati`);

  const backSquat = await prisma.exercise.findUnique({ where: { slug: "back-squat" } });
  const benchPress = await prisma.exercise.findUnique({ where: { slug: "bench-press" } });
  const barbellRow = await prisma.exercise.findUnique({ where: { slug: "barbell-row" } });
  const ohp = await prisma.exercise.findUnique({ where: { slug: "military-press" } });

  // 5) Workout template: Upper/Lower 2-day
  const existingTemplate = await prisma.workoutTemplate.findFirst({
    where: { coachId: coach.id, name: "Upper / Lower Base" },
  });

  if (!existingTemplate && backSquat && benchPress && barbellRow && ohp) {
    await prisma.workoutTemplate.create({
      data: {
        coachId: coach.id,
        organizationId: org.id,
        name: "Upper / Lower Base",
        description: "Scheda base 2 giorni per intermedi",
        difficulty: Difficulty.INTERMEDIATE,
        type: WorkoutType.HYPERTROPHY,
        tags: ["upper-lower", "base"],
        days: {
          create: [
            {
              dayNumber: 1,
              name: "Giorno A — Upper",
              exercises: {
                create: [
                  {
                    exerciseId: benchPress.id,
                    orderIndex: 1,
                    sets: 4,
                    reps: "6-8",
                    rpe: 8,
                    restSeconds: 120,
                  },
                  {
                    exerciseId: barbellRow.id,
                    orderIndex: 2,
                    sets: 4,
                    reps: "8-10",
                    rpe: 8,
                    restSeconds: 90,
                  },
                  {
                    exerciseId: ohp.id,
                    orderIndex: 3,
                    sets: 3,
                    reps: "8-10",
                    rpe: 7,
                    restSeconds: 90,
                  },
                ],
              },
            },
            {
              dayNumber: 2,
              name: "Giorno B — Lower",
              exercises: {
                create: [
                  {
                    exerciseId: backSquat.id,
                    orderIndex: 1,
                    sets: 5,
                    reps: "5",
                    rpe: 8,
                    restSeconds: 180,
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  // 6) Base food items
  const foods = [
    { name: "Pollo petto", caloriesPer100g: 165, proteinPer100g: 31, carbsPer100g: 0, fatsPer100g: 3.6 },
    { name: "Riso basmati", caloriesPer100g: 350, proteinPer100g: 7.5, carbsPer100g: 78, fatsPer100g: 0.9 },
    { name: "Olio EVO", caloriesPer100g: 884, proteinPer100g: 0, carbsPer100g: 0, fatsPer100g: 100 },
    { name: "Uova intere", caloriesPer100g: 155, proteinPer100g: 13, carbsPer100g: 1.1, fatsPer100g: 11 },
  ];
  for (const f of foods) {
    const existing = await prisma.food.findFirst({ where: { name: f.name, isGlobal: true } });
    if (!existing) await prisma.food.create({ data: { ...f, isGlobal: true } });
  }

  // 7) Workout history for luca (fake progression on the 4 key lifts)
  //    6 sessions in the last 4 weeks, Upper/Lower split.
  const deadlift = await prisma.exercise.findUnique({ where: { slug: "deadlift" } });
  if (backSquat && benchPress && ohp && deadlift) {
    await prisma.workoutLog.deleteMany({ where: { clientId: client1.id } });

    const DAY = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const sessions: Array<{
      daysAgo: number;
      label: string;
      sets: Array<{ exerciseId: string; reps: number; weight: number; rpe: number }>;
    }> = [
      {
        daysAgo: 26,
        label: "Upper W1",
        sets: [
          { exerciseId: benchPress.id, reps: 8, weight: 60, rpe: 7 },
          { exerciseId: benchPress.id, reps: 8, weight: 60, rpe: 7.5 },
          { exerciseId: benchPress.id, reps: 8, weight: 60, rpe: 8 },
          { exerciseId: ohp.id, reps: 8, weight: 40, rpe: 7 },
          { exerciseId: ohp.id, reps: 8, weight: 40, rpe: 7.5 },
        ],
      },
      {
        daysAgo: 23,
        label: "Lower W1",
        sets: [
          { exerciseId: backSquat.id, reps: 8, weight: 80, rpe: 7 },
          { exerciseId: backSquat.id, reps: 8, weight: 80, rpe: 7.5 },
          { exerciseId: backSquat.id, reps: 8, weight: 80, rpe: 8 },
          { exerciseId: deadlift.id, reps: 5, weight: 100, rpe: 7 },
          { exerciseId: deadlift.id, reps: 5, weight: 100, rpe: 7.5 },
        ],
      },
      {
        daysAgo: 19,
        label: "Upper W2",
        sets: [
          { exerciseId: benchPress.id, reps: 8, weight: 62.5, rpe: 7 },
          { exerciseId: benchPress.id, reps: 8, weight: 62.5, rpe: 7.5 },
          { exerciseId: benchPress.id, reps: 8, weight: 62.5, rpe: 8 },
          { exerciseId: ohp.id, reps: 8, weight: 42.5, rpe: 7.5 },
          { exerciseId: ohp.id, reps: 8, weight: 42.5, rpe: 8 },
        ],
      },
      {
        daysAgo: 16,
        label: "Lower W2",
        sets: [
          { exerciseId: backSquat.id, reps: 8, weight: 85, rpe: 7.5 },
          { exerciseId: backSquat.id, reps: 8, weight: 85, rpe: 8 },
          { exerciseId: backSquat.id, reps: 8, weight: 85, rpe: 8 },
          { exerciseId: deadlift.id, reps: 5, weight: 105, rpe: 7.5 },
          { exerciseId: deadlift.id, reps: 5, weight: 105, rpe: 8 },
        ],
      },
      {
        daysAgo: 12,
        label: "Upper W3",
        sets: [
          { exerciseId: benchPress.id, reps: 8, weight: 65, rpe: 7 },
          { exerciseId: benchPress.id, reps: 8, weight: 65, rpe: 7 },
          { exerciseId: benchPress.id, reps: 8, weight: 65, rpe: 7.5 },
          { exerciseId: ohp.id, reps: 8, weight: 45, rpe: 8 },
          { exerciseId: ohp.id, reps: 7, weight: 45, rpe: 9 },
        ],
      },
      {
        daysAgo: 9,
        label: "Lower W3",
        sets: [
          { exerciseId: backSquat.id, reps: 8, weight: 90, rpe: 7 },
          { exerciseId: backSquat.id, reps: 8, weight: 90, rpe: 7 },
          { exerciseId: backSquat.id, reps: 8, weight: 90, rpe: 7.5 },
          { exerciseId: deadlift.id, reps: 5, weight: 110, rpe: 7.5 },
          { exerciseId: deadlift.id, reps: 5, weight: 110, rpe: 8 },
        ],
      },
    ];

    for (const s of sessions) {
      const log = await prisma.workoutLog.create({
        data: {
          clientId: client1.id,
          date: new Date(now - s.daysAgo * DAY),
          duration: 60,
          completed: true,
          rating: 4,
          notes: s.label,
        },
      });
      await prisma.workoutSetLog.createMany({
        data: s.sets.map((set, i) => ({
          workoutLogId: log.id,
          exerciseId: set.exerciseId,
          setNumber: i + 1,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe,
          isWarmup: false,
        })),
      });
    }
    console.log(`✅ ${sessions.length} sessioni storiche create per ${client1.email}`);
  }

  console.log("✅ Seed completato");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
