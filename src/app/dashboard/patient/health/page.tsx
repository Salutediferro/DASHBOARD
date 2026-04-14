import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { patientHealthSubNav } from "@/lib/nav-items";

export default function PatientHealthPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Dati salute
        </h1>
        <p className="text-muted-foreground text-sm">
          Inserimento e visualizzazione dei tuoi parametri clinici
        </p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {patientHealthSubNav.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}>
              <Card className="transition-colors hover:bg-muted/40">
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2 text-base">
                    <Icon className="text-primary h-4 w-4" />
                    {item.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm">
                  In costruzione
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
