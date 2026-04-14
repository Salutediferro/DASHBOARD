export type ClientStatus = "ACTIVE" | "PAUSED" | "ARCHIVED";

export type ClientListItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  plan: string;
  lastCheckIn: string | null;
  adherencePercent: number;
  status: ClientStatus;
  avatarUrl: string | null;
  createdAt: string;
};

export type ClientDetail = ClientListItem & {
  birthDate: string | null;
  notes: string;
  recentWorkouts: {
    id: string;
    name: string;
    date: string;
    durationMin: number;
    completed: boolean;
  }[];
  activeNutritionPlan: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    adherencePercent: number;
  } | null;
  weightHistory: { date: string; kg: number }[];
  checkIns: {
    id: string;
    date: string;
    weight: number;
    note: string;
    feedback: string | null;
  }[];
};

const PLANS = ["Basic", "Premium", "VIP"] as const;

const NAMES = [
  "Luca Bianchi",
  "Sara Rossi",
  "Marco Conti",
  "Giulia Neri",
  "Paolo Gatti",
  "Elisa Moretti",
  "Davide Russo",
  "Martina Greco",
] as const;

const dayAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

const STATUSES: ClientStatus[] = [
  "ACTIVE",
  "ACTIVE",
  "ACTIVE",
  "ACTIVE",
  "PAUSED",
  "ACTIVE",
  "ACTIVE",
  "ARCHIVED",
];

function seedList(): ClientListItem[] {
  return NAMES.map((name, i) => ({
    id: `c${i + 1}`,
    fullName: name,
    email: `${name.toLowerCase().replace(/ /g, ".")}@example.com`,
    phone: `+39 3${String(i).padStart(2, "0")} 1234567`,
    plan: PLANS[i % PLANS.length],
    lastCheckIn: i === 7 ? null : dayAgo(i + 1),
    adherencePercent: [92, 85, 73, 58, 41, 80, 67, 0][i]!,
    status: STATUSES[i]!,
    avatarUrl: null,
    createdAt: dayAgo((i + 1) * 10),
  }));
}

const LIST = seedList();

export function getClientsMock(filters?: {
  q?: string;
  status?: ClientStatus | "ALL";
  plan?: string | "ALL";
  sortBy?: keyof ClientListItem;
  sortDir?: "asc" | "desc";
  page?: number;
  perPage?: number;
}): { items: ClientListItem[]; total: number } {
  const {
    q,
    status = "ALL",
    plan = "ALL",
    sortBy = "fullName",
    sortDir = "asc",
    page = 1,
    perPage = 20,
  } = filters ?? {};

  let rows = LIST.slice();
  if (q) {
    const term = q.toLowerCase();
    rows = rows.filter(
      (c) =>
        c.fullName.toLowerCase().includes(term) ||
        c.email.toLowerCase().includes(term),
    );
  }
  if (status !== "ALL") rows = rows.filter((c) => c.status === status);
  if (plan !== "ALL") rows = rows.filter((c) => c.plan === plan);

  rows.sort((a, b) => {
    const av = a[sortBy];
    const bv = b[sortBy];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av < bv) return sortDir === "asc" ? -1 : 1;
    if (av > bv) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

  const total = rows.length;
  const start = (page - 1) * perPage;
  return { items: rows.slice(start, start + perPage), total };
}

export function getClientDetailMock(id: string): ClientDetail | null {
  // Fallback: if the id doesn't match a mock row (e.g. real Prisma UUID in dev),
  // return the first mock client so the page still renders.
  const base = LIST.find((c) => c.id === id) ?? LIST[0];
  if (!base) return null;

  const weightHistory = Array.from({ length: 12 }, (_, i) => ({
    date: dayAgo((11 - i) * 7),
    kg: 78 + Math.sin(i / 2) * 1.5 - i * 0.25,
  }));

  return {
    ...base,
    birthDate: "1992-05-14",
    notes: "Cliente motivato, lavora in ufficio. Preferisce sessioni mattutine.",
    recentWorkouts: [
      { id: "w1", name: "Upper A", date: dayAgo(1), durationMin: 58, completed: true },
      { id: "w2", name: "Lower A", date: dayAgo(3), durationMin: 62, completed: true },
      { id: "w3", name: "Upper B", date: dayAgo(5), durationMin: 55, completed: true },
      { id: "w4", name: "Lower B", date: dayAgo(7), durationMin: 0, completed: false },
    ],
    activeNutritionPlan: {
      name: "Massa 2800 kcal",
      calories: 2800,
      protein: 180,
      carbs: 320,
      fats: 80,
      adherencePercent: 82,
    },
    weightHistory,
    checkIns: [
      {
        id: "ci1",
        date: dayAgo(7),
        weight: 78.2,
        note: "Settimana buona, energia alta",
        feedback: "Ottimo lavoro, continua così",
      },
      {
        id: "ci2",
        date: dayAgo(14),
        weight: 78.5,
        note: "Stanchezza a metà settimana",
        feedback: null,
      },
    ],
  };
}
