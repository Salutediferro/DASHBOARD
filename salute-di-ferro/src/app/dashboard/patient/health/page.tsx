import { HealthTabs } from "@/components/health/health-tabs";

export const metadata = { title: "Dati salute — Salute di Ferro" };

export default function PatientHealthPage() {
  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-heading text-3xl font-semibold tracking-tight">
          Dati salute
        </h1>
        <p className="text-muted-foreground text-sm">
          Inserisci e consulta le tue misurazioni cliniche
        </p>
      </header>
      <HealthTabs />
    </div>
  );
}
