import type { FaqCategory } from "@/lib/data/faq";

export type EscalationCategory = FaqCategory | "OTHER";
export type EscalationStatus = "OPEN" | "RESOLVED";

export type Escalation = {
  id: string;
  clientId: string;
  clientName: string;
  conversationId: string | null;
  summary: string;
  category: EscalationCategory;
  status: EscalationStatus;
  createdAt: string;
  resolvedAt?: string | null;
};

export const ESCALATIONS: Escalation[] = [
  {
    id: "esc-seed-1",
    clientId: "c1",
    clientName: "Luca Bianchi",
    conversationId: null,
    summary:
      "Cliente chiede informazioni sul rinnovo del piano Premium e sulla possibilità di downgrade.",
    category: "BILLING",
    status: "OPEN",
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
  },
  {
    id: "esc-seed-2",
    clientId: "c2",
    clientName: "Sara Rossi",
    conversationId: null,
    summary:
      "Problema di sincronizzazione con Apple Watch: gli allenamenti non compaiono nello storico.",
    category: "TECHNICAL",
    status: "OPEN",
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
];

export type CreateEscalationInput = {
  clientId: string;
  clientName: string;
  conversationId?: string | null;
  summary: string;
  category: EscalationCategory;
};

export function createEscalation(input: CreateEscalationInput): Escalation {
  const esc: Escalation = {
    id: `esc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    clientId: input.clientId,
    clientName: input.clientName,
    conversationId: input.conversationId ?? null,
    summary: input.summary,
    category: input.category,
    status: "OPEN",
    createdAt: new Date().toISOString(),
  };
  ESCALATIONS.unshift(esc);
  return esc;
}

export function listEscalations(filters?: {
  status?: EscalationStatus;
}): Escalation[] {
  return ESCALATIONS.filter(
    (e) => !filters?.status || e.status === filters.status,
  ).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export function getEscalation(id: string): Escalation | null {
  return ESCALATIONS.find((e) => e.id === id) ?? null;
}

export function resolveEscalation(id: string): Escalation | null {
  const esc = ESCALATIONS.find((e) => e.id === id);
  if (!esc) return null;
  esc.status = "RESOLVED";
  esc.resolvedAt = new Date().toISOString();
  return esc;
}

export function countOpenEscalations(): number {
  return ESCALATIONS.filter((e) => e.status === "OPEN").length;
}
