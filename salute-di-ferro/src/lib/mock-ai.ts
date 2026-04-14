export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
};

export type Conversation = {
  id: string;
  userId: string;
  userName: string;
  title: string;
  context: "WORKOUT" | "NUTRITION" | "GENERAL" | "SUPPORT";
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const dayAgo = (n: number) =>
  new Date(Date.now() - n * 86400000).toISOString();

let CONVERSATIONS: Conversation[] = [
  {
    id: "conv-1",
    userId: "c1",
    userName: "Luca Bianchi",
    title: "Dolore ginocchio squat",
    context: "WORKOUT",
    messages: [
      {
        id: "m1",
        role: "user",
        content: "Ho male al ginocchio destro quando faccio squat, cosa faccio?",
        createdAt: dayAgo(2),
      },
      {
        id: "m2",
        role: "assistant",
        content:
          "Mi dispiace sentire del fastidio. Per prima cosa consulta un medico o fisioterapista per escludere problemi seri. Nel frattempo prova: 1) riduci il carico del 30% e focalizzati sulla tecnica, 2) verifica che ginocchio e piede siano allineati, 3) evita profondità estreme finché non passa. Parla col coach per adattare la scheda.",
        createdAt: dayAgo(2),
      },
    ],
    createdAt: dayAgo(2),
    updatedAt: dayAgo(2),
  },
  {
    id: "conv-2",
    userId: "c1",
    userName: "Luca Bianchi",
    title: "Sostituire pollo",
    context: "NUTRITION",
    messages: [
      {
        id: "m3",
        role: "user",
        content: "Posso sostituire il pollo del pranzo? Non mi va oggi",
        createdAt: dayAgo(4),
      },
      {
        id: "m4",
        role: "assistant",
        content:
          "Certo! Alternative con macro simili (180g pollo petto = ~300 kcal / 55g proteine): tacchino petto 180g, merluzzo 260g, uova intere 4 grandi + 2 albumi. Adatta alle tue preferenze e mantieni il totale proteico.",
        createdAt: dayAgo(4),
      },
    ],
    createdAt: dayAgo(4),
    updatedAt: dayAgo(4),
  },
  {
    id: "conv-3",
    userId: "c2",
    userName: "Sara Rossi",
    title: "Cos'è RPE?",
    context: "GENERAL",
    messages: [
      {
        id: "m5",
        role: "user",
        content: "Cosa significa RPE nella mia scheda?",
        createdAt: dayAgo(6),
      },
      {
        id: "m6",
        role: "assistant",
        content:
          "RPE (Rate of Perceived Exertion) indica quanto pesante percepisci un set, su scala 1-10. RPE 8 = potresti fare ancora 2 ripetizioni, RPE 9 = 1 sola, RPE 10 = nessuna. Ti aiuta a regolare il carico in base alla forma del giorno.",
        createdAt: dayAgo(6),
      },
    ],
    createdAt: dayAgo(6),
    updatedAt: dayAgo(6),
  },
];

export function listConversations(userId?: string): Conversation[] {
  return CONVERSATIONS.filter((c) => !userId || c.userId === userId).sort(
    (a, b) => (a.updatedAt < b.updatedAt ? 1 : -1),
  );
}

export function getConversation(id: string): Conversation | null {
  return CONVERSATIONS.find((c) => c.id === id) ?? null;
}

export function createConversation(
  userId: string,
  userName: string,
  context: Conversation["context"] = "GENERAL",
): Conversation {
  const conv: Conversation = {
    id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    userId,
    userName,
    title: "Nuova conversazione",
    context,
    messages: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  CONVERSATIONS = [...CONVERSATIONS, conv];
  return conv;
}

export function appendMessage(
  conversationId: string,
  msg: Omit<ChatMessage, "id" | "createdAt">,
): ChatMessage {
  const conv = CONVERSATIONS.find((c) => c.id === conversationId);
  if (!conv) throw new Error("Conversation not found");
  const message: ChatMessage = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
    ...msg,
  };
  conv.messages = [...conv.messages, message];
  conv.updatedAt = message.createdAt;
  if (conv.title === "Nuova conversazione" && msg.role === "user") {
    conv.title = msg.content.slice(0, 40);
  }
  return message;
}

export function buildClientContext(): string {
  return `DATI DEL CLIENTE:
- Piano allenamento attivo: "Upper / Lower Base" (2 giorni/settimana, Hypertrophy)
- Giorno di oggi: "Giorno A — Upper" (Bench Press, Barbell Row, Dumbbell Curl, Triceps Pushdown)
- Piano nutrizionale: "Massa 2800 kcal" (180g P, 320g C, 80g F)
- Ultimo allenamento: 2 giorni fa, Lower, 62 min, 4850kg volume, rating 4/5
- Peso attuale: 79.2 kg (delta -0.8 kg in 30 giorni)
- Obiettivo: ricomposizione, mantenendo massa
- Coach: Marco Ferri`;
}
