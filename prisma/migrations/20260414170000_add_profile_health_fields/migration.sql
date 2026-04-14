-- AlterTable: add profile health & goals fields to User
ALTER TABLE "User" ADD COLUMN "primaryGoal" TEXT;
ALTER TABLE "User" ADD COLUMN "fitnessLevel" TEXT;
ALTER TABLE "User" ADD COLUMN "weeklyActivityHours" DOUBLE PRECISION;
ALTER TABLE "User" ADD COLUMN "medicalConditions" TEXT;
ALTER TABLE "User" ADD COLUMN "allergies" TEXT;
ALTER TABLE "User" ADD COLUMN "medications" TEXT;
ALTER TABLE "User" ADD COLUMN "injuries" TEXT;
