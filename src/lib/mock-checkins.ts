export type CheckInMeasurements = {
  waist: number | null;
  chest: number | null;
  armRight: number | null;
  armLeft: number | null;
  thighRight: number | null;
  thighLeft: number | null;
  calf: number | null;
};

export type CheckIn = {
  id: string;
  clientId: string;
  clientName: string;
  date: string;
  weightKg: number;
  measurements: CheckInMeasurements;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
  backPhotoUrl: string | null;
  clientNotes: string | null;
  rating: number | null;
  coachFeedback: string | null;
  aiAnalysis: string | null;
  status: "PENDING" | "REVIEWED";
};

const dayAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

// Use picsum seed placeholders so the before/after slider has something visual.
const ph = (seed: string) => `https://picsum.photos/seed/${seed}/480/720`;

let CHECKINS: CheckIn[] = [
  {
    id: "ci-1",
    clientId: "c1",
    clientName: "Luca Bianchi",
    date: dayAgo(1),
    weightKg: 79.2,
    measurements: {
      waist: 84,
      chest: 104,
      armRight: 37,
      armLeft: 36.5,
      thighRight: 58,
      thighLeft: 57.5,
      calf: 38,
    },
    frontPhotoUrl: ph("luca-front-3"),
    sidePhotoUrl: ph("luca-side-3"),
    backPhotoUrl: ph("luca-back-3"),
    clientNotes: "Settimana impegnativa ma sono riuscito a rispettare il piano",
    rating: 4,
    coachFeedback: null,
    aiAnalysis: null,
    status: "PENDING",
  },
  {
    id: "ci-2",
    clientId: "c2",
    clientName: "Sara Rossi",
    date: dayAgo(2),
    weightKg: 62.4,
    measurements: {
      waist: 68,
      chest: 92,
      armRight: 28,
      armLeft: 28,
      thighRight: 55,
      thighLeft: 54.5,
      calf: 34,
    },
    frontPhotoUrl: ph("sara-front-2"),
    sidePhotoUrl: ph("sara-side-2"),
    backPhotoUrl: ph("sara-back-2"),
    clientNotes: "Mi sento in forma, energia alta",
    rating: 5,
    coachFeedback: null,
    aiAnalysis: null,
    status: "PENDING",
  },
  {
    id: "ci-3",
    clientId: "c1",
    clientName: "Luca Bianchi",
    date: dayAgo(8),
    weightKg: 79.5,
    measurements: {
      waist: 85,
      chest: 103.5,
      armRight: 36.5,
      armLeft: 36,
      thighRight: 58,
      thighLeft: 57,
      calf: 38,
    },
    frontPhotoUrl: ph("luca-front-2"),
    sidePhotoUrl: ph("luca-side-2"),
    backPhotoUrl: ph("luca-back-2"),
    clientNotes: "Tutto ok",
    rating: 4,
    coachFeedback: "Ottimo lavoro, continua così. Focus sulla tecnica del squat.",
    aiAnalysis: null,
    status: "REVIEWED",
  },
  {
    id: "ci-4",
    clientId: "c1",
    clientName: "Luca Bianchi",
    date: dayAgo(15),
    weightKg: 80.0,
    measurements: {
      waist: 86,
      chest: 103,
      armRight: 36,
      armLeft: 36,
      thighRight: 57.5,
      thighLeft: 57,
      calf: 37.5,
    },
    frontPhotoUrl: ph("luca-front-1"),
    sidePhotoUrl: ph("luca-side-1"),
    backPhotoUrl: ph("luca-back-1"),
    clientNotes: "Partenza nuovo blocco",
    rating: 3,
    coachFeedback: "Bene, ora alziamo il volume.",
    aiAnalysis: null,
    status: "REVIEWED",
  },
];

export function listCheckIns(filters?: {
  clientId?: string;
  status?: "ALL" | "PENDING" | "REVIEWED";
  q?: string;
}): CheckIn[] {
  const { clientId, status = "ALL", q } = filters ?? {};
  return CHECKINS.filter((ci) => {
    if (clientId && ci.clientId !== clientId) return false;
    if (status !== "ALL" && ci.status !== status) return false;
    if (q && !ci.clientName.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getCheckIn(id: string): CheckIn | null {
  return CHECKINS.find((c) => c.id === id) ?? null;
}

export function getPreviousCheckIn(id: string): CheckIn | null {
  const current = getCheckIn(id);
  if (!current) return null;
  return (
    CHECKINS.filter(
      (c) => c.clientId === current.clientId && c.date < current.date,
    ).sort((a, b) => (a.date < b.date ? 1 : -1))[0] ?? null
  );
}

export function getClientCheckInHistory(clientId: string): CheckIn[] {
  return CHECKINS.filter((c) => c.clientId === clientId).sort((a, b) =>
    a.date < b.date ? -1 : 1,
  );
}

export function createCheckIn(input: {
  clientId: string;
  clientName: string;
  weightKg: number;
  measurements: CheckInMeasurements;
  frontPhotoUrl: string | null;
  sidePhotoUrl: string | null;
  backPhotoUrl: string | null;
  clientNotes: string | null;
  rating: number | null;
}): CheckIn {
  const checkIn: CheckIn = {
    id: `ci-${Date.now()}`,
    ...input,
    date: new Date().toISOString(),
    coachFeedback: null,
    aiAnalysis: null,
    status: "PENDING",
  };
  CHECKINS = [...CHECKINS, checkIn];
  return checkIn;
}

export function updateCheckIn(
  id: string,
  patch: Partial<
    Pick<CheckIn, "coachFeedback" | "aiAnalysis" | "status">
  >,
): CheckIn | null {
  const idx = CHECKINS.findIndex((c) => c.id === id);
  if (idx < 0) return null;
  CHECKINS[idx] = { ...CHECKINS[idx]!, ...patch };
  return CHECKINS[idx]!;
}
