import { streamText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import {
  appendMessage,
  buildClientContext,
  createConversation,
  getConversation,
} from "@/lib/mock-ai";
import {
  FOODS,
  findSubstitutes,
  getFoodById,
  searchFoods,
} from "@/lib/data/foods";
import { getExerciseLibrary } from "@/lib/mock-workouts";
import { searchFaqs } from "@/lib/data/faq";

const SUPPORT_SYSTEM_PROMPT = `Sei l'assistente di supporto clienti di Salute di Ferro. Rispondi a domande su account, abbonamento, uso dell'app, aspetti tecnici. Usa SEMPRE lo strumento searchFAQ prima di rispondere. Se dopo 3 scambi non hai risolto, proponi di contattare il coach. Rispondi in italiano, in modo chiaro e conciso.`;

const SYSTEM_PROMPT = `Sei l'assistente AI di Salute di Ferro, una piattaforma di coaching fitness premium.
Il tuo ruolo è aiutare il cliente con domande su allenamento e nutrizione.
Rispondi SEMPRE in italiano. Sii professionale ma motivante.

REGOLE:
- Suggerisci alternative agli esercizi se il cliente chiede (usa lo strumento getAlternativeExercise)
- Per sostituzioni alimentari usa lo strumento substituteFood
- Per cercare esercizi o alimenti usa searchExercise / searchFood
- Non modificare mai il piano senza l'approvazione del coach
- Per domande mediche, consiglia sempre di consultare un medico
- Se il cliente chiede di cambiare il piano, suggerisci di parlarne col coach`;

// -------- Tools --------------------------------------------------------------

const tools = {
  searchExercise: tool({
    description: "Cerca esercizi nella libreria per nome o gruppo muscolare",
    inputSchema: z.object({
      query: z.string().describe("Nome o muscolo da cercare"),
    }),
    execute: async ({ query }) => {
      const q = query.toLowerCase();
      return getExerciseLibrary()
        .filter(
          (e) =>
            e.name.toLowerCase().includes(q) ||
            e.muscleGroup.toLowerCase().includes(q),
        )
        .slice(0, 5)
        .map((e) => ({
          id: e.id,
          name: e.name,
          muscleGroup: e.muscleGroup,
          equipment: e.equipment,
        }));
    },
  }),
  searchFood: tool({
    description:
      "Cerca alimenti nel database. Utile per rispondere a domande tipo 'quante calorie ha X?'",
    inputSchema: z.object({
      query: z.string().describe("Nome alimento da cercare"),
    }),
    execute: async ({ query }) => {
      return searchFoods(query)
        .slice(0, 5)
        .map((f) => ({
          id: f.id,
          name: f.name,
          category: f.category,
          per100g: {
            kcal: f.caloriesPer100g,
            protein: f.proteinPer100g,
            carbs: f.carbsPer100g,
            fats: f.fatsPer100g,
          },
        }));
    },
  }),
  getAlternativeExercise: tool({
    description:
      "Trova esercizi alternativi per lo stesso gruppo muscolare. Usalo quando il cliente non può fare un esercizio.",
    inputSchema: z.object({
      exerciseName: z.string().describe("Nome dell'esercizio da sostituire"),
      reason: z
        .string()
        .optional()
        .describe("Motivo (es. dolore ginocchio, no attrezzo)"),
    }),
    execute: async ({ exerciseName }) => {
      const lib = getExerciseLibrary();
      const src = lib.find((e) =>
        e.name.toLowerCase().includes(exerciseName.toLowerCase()),
      );
      if (!src) return { error: "Esercizio non trovato" };
      const alts = lib
        .filter((e) => e.id !== src.id && e.muscleGroup === src.muscleGroup)
        .slice(0, 4)
        .map((e) => ({ name: e.name, equipment: e.equipment }));
      return { original: src.name, muscleGroup: src.muscleGroup, alternatives: alts };
    },
  }),
  substituteFood: tool({
    description:
      "Trova sostituti per un alimento con macronutrienti simili. Usa quando il cliente non ha un alimento.",
    inputSchema: z.object({
      foodName: z.string().describe("Nome alimento da sostituire"),
      quantityG: z.number().default(100),
    }),
    execute: async ({ foodName, quantityG }) => {
      const match = FOODS.find((f) =>
        f.name.toLowerCase().includes(foodName.toLowerCase()),
      );
      if (!match) return { error: "Alimento non trovato" };
      const original = getFoodById(match.id)!;
      const k = quantityG / 100;
      const subs = findSubstitutes(match.id, quantityG).map((f) => ({
        name: f.name,
        quantityG,
        kcal: Math.round(f.caloriesPer100g * k),
        protein: Math.round(f.proteinPer100g * k * 10) / 10,
      }));
      return {
        original: {
          name: original.name,
          quantityG,
          kcal: Math.round(original.caloriesPer100g * k),
          protein: Math.round(original.proteinPer100g * k * 10) / 10,
        },
        substitutes: subs,
      };
    },
  }),
};

// -------- Support mock data --------------------------------------------------

function getMockSubscriptionInfo() {
  const end = new Date();
  end.setMonth(end.getMonth() + 2);
  return {
    plan: "Premium",
    status: "ACTIVE" as const,
    currentPeriodEnd: end.toISOString(),
    cancelAtPeriodEnd: false,
  };
}

function getMockWorkoutStats(period: "week" | "month") {
  return {
    completed: period === "week" ? 3 : 12,
    planned: period === "week" ? 4 : 16,
    avgDuration: 58,
    period,
  };
}

function getMockNextAppointment() {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return {
    date: date.toISOString(),
    type: "VIDEO_CALL" as const,
    coachName: "Marco Ferri",
  };
}

const supportTools = {
  searchFAQ: tool({
    description:
      "Cerca tra le FAQ di Salute di Ferro per rispondere a domande su account, abbonamento, uso dell'app.",
    inputSchema: z.object({
      query: z.string().describe("La domanda o le parole chiave del cliente"),
    }),
    execute: async ({ query }) => {
      return searchFaqs(query, 5).map((f) => ({
        id: f.id,
        category: f.category,
        question: f.question,
        answer: f.answer,
      }));
    },
  }),
  getSubscriptionInfo: tool({
    description:
      "Restituisce lo stato attuale dell'abbonamento del cliente (piano, scadenza, rinnovo).",
    inputSchema: z.object({}),
    execute: async () => getMockSubscriptionInfo(),
  }),
  getWorkoutStats: tool({
    description:
      "Restituisce le statistiche allenamenti del cliente per un periodo (week o month).",
    inputSchema: z.object({
      period: z.enum(["week", "month"]).default("week"),
    }),
    execute: async ({ period }) => getMockWorkoutStats(period),
  }),
  getNextAppointment: tool({
    description: "Restituisce il prossimo appuntamento del cliente col coach.",
    inputSchema: z.object({}),
    execute: async () => getMockNextAppointment(),
  }),
};

function formatDateIt(iso: string) {
  return new Date(iso).toLocaleDateString("it-IT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// -------- Mock fallback ------------------------------------------------------

function mockSupportAnswer(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("scade") || t.includes("abbonamento") || t.includes("rinnovo")) {
    const sub = getMockSubscriptionInfo();
    return `Il tuo abbonamento "${sub.plan}" è ${sub.status === "ACTIVE" ? "attivo" : "inattivo"} e scade il ${formatDateIt(sub.currentPeriodEnd)}. ${sub.cancelAtPeriodEnd ? "La disdetta è già programmata." : "Si rinnoverà automaticamente."} Puoi gestirlo in Profilo > Abbonamento.`;
  }
  if (t.includes("allenament") && (t.includes("mese") || t.includes("settimana"))) {
    const period: "week" | "month" = t.includes("mese") ? "month" : "week";
    const stats = getMockWorkoutStats(period);
    return `Questo ${period === "month" ? "mese" : "settimana"} hai completato ${stats.completed} allenamenti su ${stats.planned} pianificati, con una durata media di ${stats.avgDuration} minuti. Continua così!`;
  }
  if (t.includes("appuntamento") || t.includes("call") || t.includes("coach")) {
    const appt = getMockNextAppointment();
    return `Il tuo prossimo appuntamento è una ${appt.type === "VIDEO_CALL" ? "videochiamata" : "sessione"} con ${appt.coachName} il ${formatDateIt(appt.date)}.`;
  }
  const hits = searchFaqs(q, 1);
  if (hits.length > 0) {
    return `${hits[0].answer}`;
  }
  return "Non sono riuscito a trovare una risposta precisa nelle nostre FAQ. Prova a riformulare la domanda oppure posso inoltrare la richiesta al tuo coach.";
}

function mockAnswer(q: string): string {
  const t = q.toLowerCase();
  if (t.includes("squat") && (t.includes("come") || t.includes("tecnica"))) {
    return "Per uno squat corretto: piedi larghezza spalle, punte leggermente ruotate fuori, petto alto, scendi fino a cosce parallele (o più giù se la mobilità lo permette), ginocchia allineate alle punte, spingi con i talloni. Core sempre contratto.";
  }
  if (t.includes("rpe")) {
    return "RPE (Rate of Perceived Exertion) indica quanto è pesante un set su scala 1-10. RPE 8 = potresti fare ancora 2 reps; RPE 9 = 1 rep; RPE 10 = nessuna in riserva.";
  }
  if (t.includes("proteine")) {
    return "Per massa o ricomposizione punta a 1.8-2.2g di proteine per kg di peso. Distribuisci in 4-5 pasti da 35-40g.";
  }
  if (t.includes("pollo") && t.includes("sostituir")) {
    return "Alternative al pollo (180g = ~300 kcal / 55g proteine): tacchino petto 180g, merluzzo 260g, salmone 150g, uova 4+2 albumi, tonno al naturale 230g.";
  }
  if (t.includes("male") || t.includes("dolor")) {
    return "Mi dispiace del dolore. Consulta sempre un medico o fisioterapista. Nel frattempo riduci il carico, evita i movimenti che peggiorano il dolore e parla col coach per adattare la scheda.";
  }
  if (t.includes("oggi") && t.includes("allenamento")) {
    return "Oggi hai 'Giorno A — Upper': Bench Press 4×6-8, Barbell Row 4×8-10, Dumbbell Curl 3×12, Triceps Pushdown 3×12-15. ~60 minuti.";
  }
  return "Interessante! Per risponderti al meglio dimmi di più. Ricorda: per modifiche al piano, confrontati sempre col tuo coach.";
}

// -------- Route --------------------------------------------------------------

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const body = await req.json();
  const { conversationId, message, mode } = body as {
    conversationId: string | null;
    message: string;
    mode?: "WORKOUT" | "NUTRITION" | "SUPPORT";
  };

  const isSupport = mode === "SUPPORT";
  const convContext =
    mode === "SUPPORT"
      ? "SUPPORT"
      : mode === "WORKOUT"
        ? "WORKOUT"
        : mode === "NUTRITION"
          ? "NUTRITION"
          : "GENERAL";

  // TODO: rate limit 50 msg/day per user (upstash or in-memory counter)
  let conv = conversationId ? getConversation(conversationId) : null;
  if (!conv) {
    conv = createConversation(
      user.id,
      (user.user_metadata?.fullName as string | undefined) ??
        user.email ??
        "Cliente",
      convContext,
    );
  }
  appendMessage(conv.id, { role: "user", content: message });

  const encoder = new TextEncoder();
  const apiKey = process.env.OPENAI_API_KEY;
  const hasKey = !!apiKey && apiKey !== "placeholder";

  const stream = new ReadableStream({
    async start(controller) {
      function emit(event: string, data: unknown) {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }
      emit("meta", { conversationId: conv!.id });

      let finalText = "";

      if (hasKey) {
        try {
          const result = streamText({
            model: openai("gpt-4o-mini"),
            system: isSupport
              ? `${SUPPORT_SYSTEM_PROMPT}\n\n${buildClientContext()}`
              : `${SYSTEM_PROMPT}\n\n${buildClientContext()}`,
            messages: conv!.messages
              .filter((m) => m.role !== "system")
              .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
            tools: isSupport ? { ...tools, ...supportTools } : tools,
            stopWhen: (opts) => opts.steps.length >= 4,
          });

          for await (const chunk of result.textStream) {
            finalText += chunk;
            emit("token", { token: chunk });
          }
        } catch (e) {
          finalText = isSupport ? mockSupportAnswer(message) : mockAnswer(message);
          for (const word of finalText.split(/(\s+)/)) {
            emit("token", { token: word });
            await new Promise((r) => setTimeout(r, 20));
          }
          emit("error", { message: (e as Error).message, fellBackToMock: true });
        }
      } else {
        finalText = isSupport ? mockSupportAnswer(message) : mockAnswer(message);
        for (const word of finalText.split(/(\s+)/)) {
          emit("token", { token: word });
          await new Promise((r) => setTimeout(r, 20));
        }
      }

      appendMessage(conv!.id, { role: "assistant", content: finalText });
      emit("done", {});
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
