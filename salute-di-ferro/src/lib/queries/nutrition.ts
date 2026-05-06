import { prisma } from "@/lib/prisma";
import type { Prisma, ProfessionalRole, UserRole } from "@prisma/client";
import type { UpdatePlanInput } from "@/lib/validators/nutrition";

export class NutritionAclError extends Error {
  constructor(
    public code: "forbidden" | "not_found" | "invalid_role",
    message: string,
  ) {
    super(message);
  }
}

type Caller = { id: string; role: UserRole };

// Author roles allowed to write nutrition plans. Maps 1:1 with
// `ProfessionalRole`, but isolated here so a future role expansion
// doesn't accidentally widen access.
const AUTHOR_ROLES = ["DOCTOR", "COACH"] as const satisfies readonly UserRole[];

export function professionalRoleFromUserRole(
  role: UserRole,
): ProfessionalRole | null {
  if (role === "DOCTOR") return "DOCTOR";
  if (role === "COACH") return "COACH";
  return null;
}

// Verifies the author has an ACTIVE CareRelationship with the patient.
// PATIENT callers are blocked here — patient-side reads use the GET
// helpers below which scope by `patientId = me.id` and never call this.
async function assertAuthorCanReachPatient(
  authorId: string,
  authorRole: ProfessionalRole,
  patientId: string,
): Promise<void> {
  if (authorId === patientId) {
    throw new NutritionAclError("forbidden", "Author cannot equal patient");
  }
  const link = await prisma.careRelationship.findFirst({
    where: {
      professionalId: authorId,
      patientId,
      professionalRole: authorRole,
      status: "ACTIVE",
    },
    select: { id: true },
  });
  if (!link) {
    throw new NutritionAclError(
      "forbidden",
      "No active care relationship with patient",
    );
  }
}

const planInclude = {
  patient: { select: { id: true, fullName: true, email: true } },
  author: { select: { id: true, fullName: true, role: true } },
  meals: {
    orderBy: [{ orderIndex: "asc" }, { createdAt: "asc" }],
    include: {
      foods: {
        orderBy: { createdAt: "asc" },
        include: {
          food: {
            select: {
              id: true,
              name: true,
              category: true,
              caloriesPer100g: true,
              proteinPer100g: true,
              carbsPer100g: true,
              fatsPer100g: true,
              fiberPer100g: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.NutritionPlanInclude;

export type PlanWithRelations = Prisma.NutritionPlanGetPayload<{
  include: typeof planInclude;
}>;

export async function listPlansForCaller(
  caller: Caller,
  filter: { patientId?: string },
): Promise<PlanWithRelations[]> {
  if (caller.role === "PATIENT") {
    return prisma.nutritionPlan.findMany({
      where: { patientId: caller.id },
      include: planInclude,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }
  if (caller.role === "ADMIN") {
    return prisma.nutritionPlan.findMany({
      where: filter.patientId ? { patientId: filter.patientId } : {},
      include: planInclude,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    });
  }
  // DOCTOR / COACH: only plans they authored. Optionally narrow by patient.
  return prisma.nutritionPlan.findMany({
    where: {
      authorId: caller.id,
      ...(filter.patientId ? { patientId: filter.patientId } : {}),
    },
    include: planInclude,
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });
}

export async function getPlanForCaller(
  caller: Caller,
  planId: string,
): Promise<PlanWithRelations | null> {
  const plan = await prisma.nutritionPlan.findUnique({
    where: { id: planId },
    include: planInclude,
  });
  if (!plan) return null;
  if (caller.role === "ADMIN") return plan;
  if (caller.role === "PATIENT") {
    return plan.patientId === caller.id ? plan : null;
  }
  return plan.authorId === caller.id ? plan : null;
}

export async function createPlan(
  caller: Caller,
  input: { patientId: string; name?: string; startDate?: string },
): Promise<PlanWithRelations> {
  const authorRole = professionalRoleFromUserRole(caller.role);
  if (!authorRole || !(AUTHOR_ROLES as readonly UserRole[]).includes(caller.role)) {
    throw new NutritionAclError("invalid_role", "Only DOCTOR or COACH can create plans");
  }
  await assertAuthorCanReachPatient(caller.id, authorRole, input.patientId);

  // Auto-deactivate any existing active plan for the same patient — at
  // most one active plan per patient is the rule the patient page assumes.
  await prisma.nutritionPlan.updateMany({
    where: { patientId: input.patientId, isActive: true },
    data: { isActive: false },
  });

  const created = await prisma.nutritionPlan.create({
    data: {
      authorId: caller.id,
      authorRole,
      patientId: input.patientId,
      name: input.name?.trim() || "Nuovo piano",
      startDate: input.startDate ? new Date(input.startDate) : new Date(),
      isActive: true,
      meals: {
        create: [
          { name: "Colazione", orderIndex: 0, time: "07:30" },
          { name: "Pranzo", orderIndex: 1, time: "13:00" },
          { name: "Cena", orderIndex: 2, time: "20:00" },
        ],
      },
    },
    include: planInclude,
  });
  return created;
}

// Replace-set semantics: meals + meal-foods on disk are reconciled to
// match `input.meals` exactly. We delete missing meals/foods, update the
// ones whose ids are still present, and create new ones (no id supplied).
// Done in a single transaction so a partial failure doesn't leave the
// plan with half-updated meals.
export async function updatePlan(
  caller: Caller,
  planId: string,
  input: UpdatePlanInput,
): Promise<PlanWithRelations> {
  const existing = await prisma.nutritionPlan.findUnique({
    where: { id: planId },
    select: { id: true, authorId: true, authorRole: true, patientId: true },
  });
  if (!existing) throw new NutritionAclError("not_found", "Plan not found");
  if (caller.role !== "ADMIN" && existing.authorId !== caller.id) {
    throw new NutritionAclError("forbidden", "Not the plan author");
  }
  if (input.patientId && input.patientId !== existing.patientId) {
    throw new NutritionAclError(
      "forbidden",
      "Cannot reassign a plan to a different patient",
    );
  }

  await prisma.$transaction(async (tx) => {
    if (input.isActive === true) {
      // Enforce single-active per patient.
      await tx.nutritionPlan.updateMany({
        where: {
          patientId: existing.patientId,
          isActive: true,
          id: { not: planId },
        },
        data: { isActive: false },
      });
    }

    await tx.nutritionPlan.update({
      where: { id: planId },
      data: {
        name: input.name,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate:
          input.endDate === null
            ? null
            : input.endDate
              ? new Date(input.endDate)
              : undefined,
        targetCalories: input.targetCalories ?? undefined,
        targetProtein: input.targetProtein ?? undefined,
        targetCarbs: input.targetCarbs ?? undefined,
        targetFats: input.targetFats ?? undefined,
        notes: input.notes ?? undefined,
        isActive: input.isActive,
      },
    });

    if (!input.meals) return;

    const incomingMealIds = new Set(
      input.meals.filter((m) => m.id).map((m) => m.id as string),
    );
    // Drop meals removed from the payload (cascades meal-foods).
    await tx.nutritionMeal.deleteMany({
      where: { planId, id: { notIn: Array.from(incomingMealIds) } },
    });

    for (const meal of input.meals) {
      let mealId = meal.id;
      if (mealId) {
        await tx.nutritionMeal.update({
          where: { id: mealId },
          data: {
            name: meal.name,
            orderIndex: meal.orderIndex,
            time: meal.time ?? null,
            targetCalories: meal.targetCalories ?? null,
            targetProtein: meal.targetProtein ?? null,
            targetCarbs: meal.targetCarbs ?? null,
            targetFats: meal.targetFats ?? null,
          },
        });
      } else {
        const created = await tx.nutritionMeal.create({
          data: {
            planId,
            name: meal.name,
            orderIndex: meal.orderIndex,
            time: meal.time ?? null,
            targetCalories: meal.targetCalories ?? null,
            targetProtein: meal.targetProtein ?? null,
            targetCarbs: meal.targetCarbs ?? null,
            targetFats: meal.targetFats ?? null,
          },
          select: { id: true },
        });
        mealId = created.id;
      }

      const incomingFoodIds = new Set(
        meal.foods.filter((f) => f.id).map((f) => f.id as string),
      );
      await tx.nutritionMealFood.deleteMany({
        where: { mealId, id: { notIn: Array.from(incomingFoodIds) } },
      });

      for (const f of meal.foods) {
        if (f.id) {
          await tx.nutritionMealFood.update({
            where: { id: f.id },
            data: {
              foodId: f.foodId,
              quantity: f.quantity,
              unit: f.unit,
              notes: f.notes ?? null,
            },
          });
        } else {
          await tx.nutritionMealFood.create({
            data: {
              mealId,
              foodId: f.foodId,
              quantity: f.quantity,
              unit: f.unit,
              notes: f.notes ?? null,
            },
          });
        }
      }
    }
  });

  // Re-read with the full include shape so the response mirrors GET.
  const fresh = await prisma.nutritionPlan.findUnique({
    where: { id: planId },
    include: planInclude,
  });
  return fresh!;
}

export async function deletePlan(caller: Caller, planId: string): Promise<void> {
  const existing = await prisma.nutritionPlan.findUnique({
    where: { id: planId },
    select: { authorId: true },
  });
  if (!existing) throw new NutritionAclError("not_found", "Plan not found");
  if (caller.role !== "ADMIN" && existing.authorId !== caller.id) {
    throw new NutritionAclError("forbidden", "Not the plan author");
  }
  await prisma.nutritionPlan.delete({ where: { id: planId } });
}

export async function getActivePlanForPatient(
  patientId: string,
): Promise<PlanWithRelations | null> {
  return prisma.nutritionPlan.findFirst({
    where: { patientId, isActive: true },
    include: planInclude,
    orderBy: { createdAt: "desc" },
  });
}

// Macro helpers: meal-foods store quantity in `unit`, but the per-100g
// macros only make sense for GRAMS (and ML for liquids treated 1:1 with
// grams). For PIECE/SCOOP/TABLESPOON we render the row but skip macro
// computation — the food picker only emits GRAMS/ML today, so the other
// units exist mainly for free-typed prescription text.
export function macrosForMealFood(
  food: { caloriesPer100g: number; proteinPer100g: number; carbsPer100g: number; fatsPer100g: number },
  quantity: number,
  unit: string,
): { calories: number; protein: number; carbs: number; fats: number } {
  if (unit !== "GRAMS" && unit !== "ML") {
    return { calories: 0, protein: 0, carbs: 0, fats: 0 };
  }
  const k = quantity / 100;
  return {
    calories: Math.round(food.caloriesPer100g * k),
    protein: Math.round(food.proteinPer100g * k * 10) / 10,
    carbs: Math.round(food.carbsPer100g * k * 10) / 10,
    fats: Math.round(food.fatsPer100g * k * 10) / 10,
  };
}

export function totalsForPlan(plan: PlanWithRelations): {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
} {
  let calories = 0;
  let protein = 0;
  let carbs = 0;
  let fats = 0;
  for (const meal of plan.meals) {
    for (const mf of meal.foods) {
      const m = macrosForMealFood(mf.food, mf.quantity, mf.unit);
      calories += m.calories;
      protein += m.protein;
      carbs += m.carbs;
      fats += m.fats;
    }
  }
  return {
    calories,
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fats: Math.round(fats * 10) / 10,
  };
}
