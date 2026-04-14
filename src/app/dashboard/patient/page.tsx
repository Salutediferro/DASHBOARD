"use client";

import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useUser } from "@/lib/hooks/use-user";

export default function ClientDashboardPage() {
  const { profile, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Ciao{profile?.firstName ? `, ${profile.firstName}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm">
          {profile?.email}
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dashboard paziente</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          In costruzione. Le sezioni di questa area verranno abilitate nei
          prossimi moduli (biometria, referti, appuntamenti, check-in).
        </CardContent>
      </Card>
    </div>
  );
}
