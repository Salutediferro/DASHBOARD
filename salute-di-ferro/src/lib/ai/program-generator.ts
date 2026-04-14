import { Equipment, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import type {
  AIProgram,
  AIDay,
  GenerateProgramInput,
} from "@/lib/validators/ai-program";

// Dev bypass mirrors src/app/api/exercises/route.ts. TODO: remove dev bypass
export function isDevBypass(req: Request) {
  return (
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1"
  );
}

const DEV_USER = {
  id: "dev-bypass",
  app_metadata: { role: "ADMIN", organizationId: null },
  user_metadata: {},
} as const;

export async function requireCoachOrDev(req: Request) {
  if (isDevBypass(req)) return DEV_USER;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const role =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined) ??
    null;
  if (role !== "COACH" && role !== "ADMIN") return null;
  return user;
}

export type CatalogItem = {
  id: string;
  name: string;
  nameIt: string;
  muscleGroup: string;
  equipment: string;
};

export async function fetchExerciseCatalog(
  equipmentProfile: GenerateProgramInput["equipment"],
): Promise<CatalogItem[]> {
  const where: Prisma.ExerciseWhereInput = {};
  if (equipmentProfile === "BODYWEIGHT") {
    where.equipment = Equipment.BODYWEIGHT;
  } else if (equipmentProfile === "DUMBBELLS_ONLY") {
    where.equipment = { in: [Equipment.DUMBBELL, Equipment.BODYWEIGHT] };
  }
  // FULL_GYM + HOME_GYM: no restriction, let the AI choose
  const rows = await prisma.exercise.findMany({
    where,
    select: {
      id: true,
      name: true,
      nameIt: true,
      muscleGroup: true,
      equipment: true,
    },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    nameIt: r.nameIt,
    muscleGroup: String(r.muscleGroup),
    equipment: String(r.equipment),
  }));
}

const GUIDELINES = `LINEE GUIDA PROGRAMMAZIONE:
- Volume settimanale: 10-20 set per gruppo muscolare grande (petto, schiena, quadricipiti), 6-12 per piccoli (bicipiti, tricipiti, polpacci, spalle laterali).
- Ordina sempre i compound (multiarticolari) prima degli isolation.
- Frequenza: almeno 2x/settimana per muscolo quando possibile, in base allo split scelto.
- RPE: progressivo, 7-8 per la maggior parte dei set di lavoro, 6-7 per i principianti.
- Rest: 120-180s compound pesanti, 60-90s isolation.
- Superset utili quando la sessione deve stare entro il tempo richiesto.
- Reps: forza 3-6, ipertrofia 6-12, resistenza 12-20.
- Gli exerciseId nel JSON di output DEVONO venire ESATTAMENTE dal catalogo fornito. NON inventare id.`;

export function buildSystemPrompt() {
  return `Sei un coach strength & conditioning esperto. Crei programmi di allenamento settimanali professionali, periodizzati e ben bilanciati. Rispondi SEMPRE con nomi di giorni ed esercizi in italiano. Segui rigorosamente le linee guida fornite.`;
}

export function buildGeneratePrompt(
  input: GenerateProgramInput,
  catalog: CatalogItem[],
) {
  return `${GUIDELINES}

PARAMETRI CLIENTE:
- Obiettivo: ${input.goal}
- Livello: ${input.level}
- Giorni/settimana: ${input.daysPerWeek}
- Split richiesto: ${input.split}${input.split === "AUTO" ? " (scegli tu il migliore in base ai giorni)" : ""}
- Durata sessione: ${input.sessionDuration} min
- Attrezzatura: ${input.equipment}
- Focus: ${input.focusAreas.join(", ") || "nessuno specifico"}
- Infortuni/limitazioni: ${input.injuries?.trim() || "nessuno"}
- Note coach: ${input.notes?.trim() || "nessuna"}

CATALOGO ESERCIZI (usa SOLO questi id):
${JSON.stringify(
  catalog.map((c) => ({
    id: c.id,
    name: c.nameIt,
    muscle: c.muscleGroup,
    eq: c.equipment,
  })),
)}

Genera un programma completo con ${input.daysPerWeek} giorni. Ogni exerciseId DEVE essere uno del catalogo sopra.`;
}

export function buildAdjustPrompt(
  program: AIProgram,
  instruction: string,
  catalog: CatalogItem[],
) {
  return `${GUIDELINES}

PROGRAMMA ATTUALE:
${JSON.stringify(program)}

MODIFICA RICHIESTA:
${instruction}

CATALOGO ESERCIZI (usa SOLO questi id):
${JSON.stringify(
  catalog.map((c) => ({
    id: c.id,
    name: c.nameIt,
    muscle: c.muscleGroup,
    eq: c.equipment,
  })),
)}

Restituisci il programma COMPLETO aggiornato nello stesso schema. Ogni exerciseId DEVE venire dal catalogo.`;
}

export function buildRegenerateDayPrompt(
  input: GenerateProgramInput,
  program: AIProgram,
  dayIndex: number,
  catalog: CatalogItem[],
) {
  const otherDays = program.days.filter((_, i) => i !== dayIndex);
  const targetDay = program.days[dayIndex];
  return `${GUIDELINES}

PARAMETRI: goal=${input.goal}, level=${input.level}, durata=${input.sessionDuration}min, equipment=${input.equipment}, focus=${input.focusAreas.join(",")}.

ALTRI GIORNI GIA' PROGRAMMATI (non duplicare eccessivamente il volume):
${JSON.stringify(otherDays.map((d) => ({ name: d.name, exercises: d.exercises.map((e) => e.exerciseName) })))}

GIORNO DA RIGENERARE (sostituiscilo completamente, nome suggerito: "${targetDay?.name ?? "Giorno"}"):

CATALOGO ESERCIZI (usa SOLO questi id):
${JSON.stringify(
  catalog.map((c) => ({
    id: c.id,
    name: c.nameIt,
    muscle: c.muscleGroup,
    eq: c.equipment,
  })),
)}

Restituisci SOLO un giorno nello schema richiesto.`;
}

// Drops hallucinated exerciseIds; names are backfilled from the catalog.
export function sanitizeProgram(program: AIProgram, catalog: CatalogItem[]) {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const dropped: string[] = [];
  const emptiedDays: number[] = [];
  const days = program.days.map((day, di) => {
    const exercises = day.exercises.filter((ex) => {
      const hit = byId.get(ex.exerciseId);
      if (!hit) {
        dropped.push(ex.exerciseId);
        return false;
      }
      ex.exerciseName = hit.nameIt;
      return true;
    });
    if (exercises.length === 0) emptiedDays.push(di);
    return { ...day, exercises };
  });
  return { program: { ...program, days }, dropped, emptiedDays };
}

export function sanitizeDay(day: AIDay, catalog: CatalogItem[]) {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const dropped: string[] = [];
  const exercises = day.exercises.filter((ex) => {
    const hit = byId.get(ex.exerciseId);
    if (!hit) {
      dropped.push(ex.exerciseId);
      return false;
    }
    ex.exerciseName = hit.nameIt;
    return true;
  });
  return { day: { ...day, exercises }, dropped };
}
