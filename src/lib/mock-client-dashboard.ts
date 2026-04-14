export type ClientDashboardData = {
  todayWorkout: {
    name: string;
    exerciseCount: number;
    estimatedMin: number;
    isRestDay: boolean;
    completed: boolean;
    completedAt: string | null;
    summary: { volumeKg: number; durationMin: number } | null;
  };
  nutrition: {
    planName: string;
    target: { calories: number; protein: number; carbs: number; fats: number };
    consumed: { calories: number; protein: number; carbs: number; fats: number };
    nextMeal: { name: string; time: string | null } | null;
  };
  progress: {
    weightHistory: { date: string; kg: number }[];
    startWeight: number;
    currentWeight: number;
    streak: number;
    nextCheckInDays: number;
  };
  metricsToday: {
    weightKg: number | null;
    sleepHours: number | null;
    energyLevel: number | null;
  };
  messages: {
    lastCoachFeedback: {
      coachName: string;
      text: string;
      createdAt: string;
    } | null;
    unreadNotifications: number;
  };
};

const MOTIVATIONAL_QUOTES = [
  "La disciplina è scegliere tra ciò che vuoi adesso e ciò che vuoi di più.",
  "Il ferro non mente. Le scuse sì.",
  "Un set alla volta, un giorno alla volta.",
  "La costanza batte il talento quando il talento non è costante.",
  "Il dolore di oggi è la forza di domani.",
  "Non fermarti quando sei stanco. Fermati quando hai finito.",
  "Il miglior progetto a cui lavorerai mai sei tu.",
  "Sweat is just fat crying.",
  "Trasforma l'invidia in ispirazione, la pressione in potenza.",
  "Non devi essere grande per iniziare, ma devi iniziare per essere grande.",
  "La mente si arrende molto prima del corpo.",
  "Ogni ripetizione ti avvicina alla versione migliore di te.",
  "Sii più forte delle tue scuse.",
  "Salute di ferro, volontà di acciaio.",
  "Il tuo unico limite sei tu.",
  "Allenati come un guerriero, vivi come un campione.",
  "I risultati arrivano a chi non molla.",
  "La routine diventa rito, il rito diventa risultato.",
  "Non conta quanto sollevi, conta quanto sei coerente.",
  "Il tuo corpo può farcela. È la tua mente che devi convincere.",
];

export function pickQuote(seed: number): string {
  return MOTIVATIONAL_QUOTES[seed % MOTIVATIONAL_QUOTES.length]!;
}

const dayAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

export function getClientDashboardMock(): ClientDashboardData {
  const weightHistory = Array.from({ length: 30 }, (_, i) => {
    const day = 29 - i;
    return {
      date: dayAgo(day),
      kg: 80 - i * 0.08 + Math.sin(i / 3) * 0.3,
    };
  });

  return {
    todayWorkout: {
      name: "Giorno A — Upper",
      exerciseCount: 4,
      estimatedMin: 60,
      isRestDay: false,
      completed: false,
      completedAt: null,
      summary: null,
    },
    nutrition: {
      planName: "Massa 2800 kcal",
      target: { calories: 2800, protein: 180, carbs: 320, fats: 80 },
      consumed: { calories: 1180, protein: 84, carbs: 135, fats: 38 },
      nextMeal: { name: "Pranzo", time: "13:00" },
    },
    progress: {
      weightHistory,
      startWeight: weightHistory[0]!.kg,
      currentWeight: weightHistory.at(-1)!.kg,
      streak: 5,
      nextCheckInDays: 3,
    },
    metricsToday: {
      weightKg: null,
      sleepHours: null,
      energyLevel: null,
    },
    messages: {
      lastCoachFeedback: {
        coachName: "Marco Ferri",
        text: "Ottimo lavoro sulla bench la settimana scorsa — ora focus su OHP.",
        createdAt: dayAgo(1),
      },
      unreadNotifications: 2,
    },
  };
}
