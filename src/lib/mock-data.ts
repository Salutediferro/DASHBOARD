export type CoachDashboardData = {
  today: {
    date: string;
    appointments: {
      id: string;
      clientName: string;
      time: string;
      type: "IN_PERSON" | "VIDEO_CALL" | "CHECK_IN";
    }[];
  };
  activeClients: {
    total: number;
    trendPercent: number;
    recent: { id: string; name: string; avatarUrl: string | null; joinedAt: string }[];
  };
  pendingCheckins: {
    count: number;
    oldestDays: number;
  };
  revenue: {
    mrrCents: number;
    trendPercent: number;
    upcomingRenewals: { id: string; clientName: string; amountCents: number; date: string }[];
  };
  adherence: { name: string; percent: number }[];
  activity: {
    id: string;
    type: "WORKOUT_LOG" | "CHECK_IN" | "NEW_CLIENT" | "PAYMENT";
    actorName: string;
    actorInitials: string;
    message: string;
    timestamp: string;
  }[];
};

export function getCoachDashboardMock(): CoachDashboardData {
  const now = new Date();
  const iso = (d: Date) => d.toISOString();
  const dayAgo = (n: number) => iso(new Date(now.getTime() - n * 86400000));

  return {
    today: {
      date: now.toISOString().slice(0, 10),
      appointments: [
        { id: "a1", clientName: "Luca Bianchi", time: "09:30", type: "IN_PERSON" },
        { id: "a2", clientName: "Sara Rossi", time: "11:00", type: "VIDEO_CALL" },
        { id: "a3", clientName: "Marco Conti", time: "15:30", type: "CHECK_IN" },
      ],
    },
    activeClients: {
      total: 24,
      trendPercent: 12.5,
      recent: [
        { id: "c1", name: "Giulia Neri", avatarUrl: null, joinedAt: dayAgo(2) },
        { id: "c2", name: "Paolo Gatti", avatarUrl: null, joinedAt: dayAgo(5) },
        { id: "c3", name: "Elisa Moretti", avatarUrl: null, joinedAt: dayAgo(8) },
      ],
    },
    pendingCheckins: {
      count: 5,
      oldestDays: 4,
    },
    revenue: {
      mrrCents: 348000,
      trendPercent: 8.2,
      upcomingRenewals: [
        { id: "r1", clientName: "Luca Bianchi", amountCents: 14900, date: dayAgo(-2) },
        { id: "r2", clientName: "Sara Rossi", amountCents: 9900, date: dayAgo(-4) },
        { id: "r3", clientName: "Marco Conti", amountCents: 14900, date: dayAgo(-6) },
      ],
    },
    adherence: [
      { name: "Luca B.", percent: 92 },
      { name: "Sara R.", percent: 85 },
      { name: "Marco C.", percent: 73 },
      { name: "Giulia N.", percent: 58 },
      { name: "Paolo G.", percent: 41 },
    ],
    activity: [
      {
        id: "ev1",
        type: "WORKOUT_LOG",
        actorName: "Luca Bianchi",
        actorInitials: "LB",
        message: "ha completato 'Upper A' in 58 min",
        timestamp: dayAgo(0.05),
      },
      {
        id: "ev2",
        type: "CHECK_IN",
        actorName: "Sara Rossi",
        actorInitials: "SR",
        message: "ha inviato il check-in settimanale",
        timestamp: dayAgo(0.2),
      },
      {
        id: "ev3",
        type: "PAYMENT",
        actorName: "Marco Conti",
        actorInitials: "MC",
        message: "ha rinnovato l'abbonamento €149",
        timestamp: dayAgo(0.5),
      },
      {
        id: "ev4",
        type: "NEW_CLIENT",
        actorName: "Giulia Neri",
        actorInitials: "GN",
        message: "si è registrata come nuova cliente",
        timestamp: dayAgo(2),
      },
      {
        id: "ev5",
        type: "WORKOUT_LOG",
        actorName: "Paolo Gatti",
        actorInitials: "PG",
        message: "ha completato 'Full Body' in 72 min",
        timestamp: dayAgo(2.3),
      },
    ],
  };
}
