"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { Conversation } from "@/lib/mock-ai";

function topicBadge(ctx: Conversation["context"]) {
  const map: Record<Conversation["context"], { label: string; cls: string }> = {
    WORKOUT: { label: "Allenamento", cls: "bg-primary/20 text-primary" },
    NUTRITION: { label: "Nutrizione", cls: "bg-green-500/20 text-green-400" },
    GENERAL: { label: "Generale", cls: "bg-muted text-muted-foreground" },
    SUPPORT: { label: "Supporto", cls: "bg-blue-500/20 text-blue-400" },
  };
  const s = map[ctx];
  return <Badge className={s.cls}>{s.label}</Badge>;
}

export default function CoachAIPage() {
  const [q, setQ] = React.useState("");
  const [selected, setSelected] = React.useState<Conversation | null>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["coach-ai-conversations"],
    queryFn: async () => {
      const res = await fetch("/api/ai/conversations");
      return res.json();
    },
  });

  const filtered = conversations.filter((c) => {
    if (!q) return true;
    const term = q.toLowerCase();
    return (
      c.userName.toLowerCase().includes(term) ||
      c.title.toLowerCase().includes(term) ||
      c.messages.some((m) => m.content.toLowerCase().includes(term))
    );
  });

  // Topic stats
  const stats = conversations.reduce(
    (acc, c) => {
      acc[c.context] = (acc[c.context] ?? 0) + 1;
      return acc;
    },
    {} as Record<Conversation["context"], number>,
  );

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          AI Assistant
        </h1>
        <p className="text-muted-foreground text-sm">
          Conversazioni dei tuoi clienti
        </p>
      </header>

      {/* Insight cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Sparkles className="text-primary h-5 w-5" />
            <div>
              <p className="text-muted-foreground text-[10px] uppercase">Totali</p>
              <p className="font-heading text-xl font-semibold">
                {conversations.length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-[10px] uppercase">
              Allenamento
            </p>
            <p className="font-heading text-xl font-semibold">
              {stats.WORKOUT ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-[10px] uppercase">Nutrizione</p>
            <p className="font-heading text-xl font-semibold">
              {stats.NUTRITION ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-muted-foreground text-[10px] uppercase">Generale</p>
            <p className="font-heading text-xl font-semibold">
              {stats.GENERAL ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Cerca cliente, titolo o testo messaggio..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <Card className="max-h-[70vh] overflow-hidden">
          <CardContent className="flex flex-col gap-2 p-3">
            {isLoading ? (
              <p className="text-muted-foreground text-sm">Caricamento...</p>
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nessun risultato</p>
            ) : (
              <ul className="flex flex-col gap-1 overflow-y-auto">
                {filtered.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className={cn(
                        "hover:bg-muted w-full rounded-md p-3 text-left",
                        selected?.id === c.id && "bg-primary/10",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {c.userName}
                        </p>
                        {topicBadge(c.context)}
                      </div>
                      <p className="text-muted-foreground mt-0.5 truncate text-xs">
                        {c.title}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="max-h-[70vh] overflow-hidden">
          <CardContent className="flex h-full flex-col gap-3 p-4">
            {!selected ? (
              <p className="text-muted-foreground m-auto text-sm">
                Seleziona una conversazione
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{selected.userName}</p>
                    <p className="text-muted-foreground text-xs">
                      {selected.title}
                    </p>
                  </div>
                  {topicBadge(selected.context)}
                </div>
                <div className="flex flex-1 flex-col gap-3 overflow-y-auto">
                  {selected.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex",
                        m.role === "user" ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                          m.role === "user"
                            ? "bg-muted"
                            : "border-primary/30 bg-card border",
                        )}
                      >
                        {m.content}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
