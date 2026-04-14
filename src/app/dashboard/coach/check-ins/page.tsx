"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CheckIn } from "@/lib/mock-checkins";

export default function CheckInsListPage() {
  const [q, setQ] = React.useState("");
  const [status, setStatus] = React.useState<"ALL" | "PENDING" | "REVIEWED">(
    "ALL",
  );
  const params = new URLSearchParams({ q, status });
  const { data = [], isLoading } = useQuery<CheckIn[]>({
    queryKey: ["check-ins", params.toString()],
    queryFn: async () => {
      const res = await fetch(`/api/check-ins?${params}`);
      return res.json();
    },
  });

  const pendingCount = data.filter((c) => c.status === "PENDING").length;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            Check-in
          </h1>
          <p className="text-muted-foreground text-sm">
            {pendingCount} da revisionare
          </p>
        </div>
      </header>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Cerca cliente..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tutti</SelectItem>
              <SelectItem value="PENDING">Da revisionare</SelectItem>
              <SelectItem value="REVIEWED">Revisionati</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {isLoading ? (
        <p className="text-muted-foreground">Caricamento...</p>
      ) : data.length === 0 ? (
        <p className="text-muted-foreground">Nessun check-in trovato.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.map((ci) => (
            <Link key={ci.id} href={`/dashboard/coach/check-ins/${ci.id}`}>
              <Card className="hover:border-primary/40 transition-colors">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar className="h-11 w-11">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs">
                      {ci.clientName
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {ci.clientName}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {new Date(ci.date).toLocaleDateString("it-IT", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      · {ci.weightKg} kg
                    </p>
                  </div>
                  {ci.status === "PENDING" ? (
                    <Badge className="bg-yellow-500/20 text-yellow-400">
                      Da revisionare
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500/20 text-green-400">
                      Revisionato
                    </Badge>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
