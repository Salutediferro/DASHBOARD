-- AlterEnum
BEGIN;
CREATE TYPE "UserRole_new" AS ENUM ('ADMIN', 'DOCTOR', 'COACH', 'PATIENT');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
-- Map legacy CLIENT -> PATIENT inside the cast (PATIENT does not yet exist in the old enum)
ALTER TABLE "User" ALTER COLUMN "role" TYPE "UserRole_new" USING (CASE WHEN "role"::text = 'CLIENT' THEN 'PATIENT'::"UserRole_new" ELSE "role"::text::"UserRole_new" END);
ALTER TYPE "UserRole" RENAME TO "UserRole_old";
ALTER TYPE "UserRole_new" RENAME TO "UserRole";
DROP TYPE "public"."UserRole_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PATIENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "Exercise" DROP CONSTRAINT "Exercise_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "Food" DROP CONSTRAINT "Food_organizationId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionLog" DROP CONSTRAINT "NutritionLog_clientId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionLogFood" DROP CONSTRAINT "NutritionLogFood_logId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionMeal" DROP CONSTRAINT "NutritionMeal_planId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionMealFood" DROP CONSTRAINT "NutritionMealFood_foodId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionMealFood" DROP CONSTRAINT "NutritionMealFood_mealId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionPlan" DROP CONSTRAINT "NutritionPlan_clientId_fkey";

-- DropForeignKey
ALTER TABLE "NutritionPlan" DROP CONSTRAINT "NutritionPlan_coachId_fkey";

-- DropForeignKey
ALTER TABLE "ProgressionSuggestion" DROP CONSTRAINT "ProgressionSuggestion_clientId_fkey";

-- DropForeignKey
ALTER TABLE "ProgressionSuggestion" DROP CONSTRAINT "ProgressionSuggestion_coachId_fkey";

-- DropForeignKey
ALTER TABLE "ProgressionSuggestion" DROP CONSTRAINT "ProgressionSuggestion_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutAssignment" DROP CONSTRAINT "WorkoutAssignment_clientId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutAssignment" DROP CONSTRAINT "WorkoutAssignment_coachId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutAssignment" DROP CONSTRAINT "WorkoutAssignment_templateId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutDay" DROP CONSTRAINT "WorkoutDay_templateId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutExercise" DROP CONSTRAINT "WorkoutExercise_dayId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutExercise" DROP CONSTRAINT "WorkoutExercise_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutLog" DROP CONSTRAINT "WorkoutLog_clientId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutSetLog" DROP CONSTRAINT "WorkoutSetLog_exerciseId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutSetLog" DROP CONSTRAINT "WorkoutSetLog_workoutLogId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutTemplate" DROP CONSTRAINT "WorkoutTemplate_coachId_fkey";

-- DropForeignKey
ALTER TABLE "WorkoutTemplate" DROP CONSTRAINT "WorkoutTemplate_organizationId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PATIENT';

-- DropTable
DROP TABLE "Exercise";

-- DropTable
DROP TABLE "Food";

-- DropTable
DROP TABLE "NutritionLog";

-- DropTable
DROP TABLE "NutritionLogFood";

-- DropTable
DROP TABLE "NutritionMeal";

-- DropTable
DROP TABLE "NutritionMealFood";

-- DropTable
DROP TABLE "NutritionPlan";

-- DropTable
DROP TABLE "ProgressionSuggestion";

-- DropTable
DROP TABLE "WorkoutAssignment";

-- DropTable
DROP TABLE "WorkoutDay";

-- DropTable
DROP TABLE "WorkoutExercise";

-- DropTable
DROP TABLE "WorkoutLog";

-- DropTable
DROP TABLE "WorkoutSetLog";

-- DropTable
DROP TABLE "WorkoutTemplate";

-- DropEnum
DROP TYPE "Difficulty";

-- DropEnum
DROP TYPE "Equipment";

-- DropEnum
DROP TYPE "FoodConfidence";

-- DropEnum
DROP TYPE "FoodUnit";

-- DropEnum
DROP TYPE "MuscleGroup";

-- DropEnum
DROP TYPE "ProgressionAction";

-- DropEnum
DROP TYPE "ProgressionStatus";

-- DropEnum
DROP TYPE "WorkoutType";
