import { notFound } from "next/navigation";
import {
  Activity,
  Dumbbell,
  HeartPulse,
  Inbox,
  Plus,
  Users,
} from "lucide-react";
import {
  Divider,
  EmptyState,
  Logo,
  MetricRing,
  PageHeader,
  SectionHeader,
  StatCard,
} from "@/components/brand";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Design System — SDF",
  robots: { index: false, follow: false },
};

export const dynamic = "force-static";

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const sparkUp = [12, 14, 13, 16, 15, 18, 21, 20, 24, 26];
  const sparkDown = [32, 30, 31, 28, 27, 25, 24, 22, 21, 19];

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title="Design System"
        description="Componenti brand SDF — showcase di stati e varianti."
        breadcrumbs={[
          { label: "Dev", href: "/" },
          { label: "Design System" },
        ]}
        actions={
          <Button variant="outline" size="sm">
            <Plus />
            Nuovo
          </Button>
        }
      />

      <div className="mx-auto max-w-6xl space-y-12 px-6 pt-10">
        <Showcase title="Typography & tokens">
          <div className="grid gap-3">
            <p className="text-display text-5xl">Display 5xl — Forza</p>
            <p className="text-display text-4xl">Display 4xl — Disciplina</p>
            <p className="text-display text-3xl">Display 3xl — Risultati</p>
            <p className="text-2xl">Body 2xl — Inter regular</p>
            <p className="text-base">Body base — Inter regular</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Caption XS uppercase muted
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip">chip</span>
            <span className="chip chip-red">chip-red</span>
            <span className="chip chip-silver">chip-silver</span>
            <span className="chip">12 attivi</span>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs text-muted-foreground">
              primary scale (brand red)
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {(["50", "100", "500", "700", "900"] as const).map((step) => (
                <div key={step} className="surface-1 p-3">
                  <div
                    className="h-10 rounded"
                    style={{ background: `var(--primary-${step})` }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    primary-{step}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6">
            <p className="mb-2 text-xs text-muted-foreground">
              accent scale (chrome silver)
            </p>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
              {(["50", "100", "500", "700", "900"] as const).map((step) => (
                <div key={step} className="surface-1 p-3">
                  <div
                    className="h-10 rounded"
                    style={{ background: `var(--accent-${step})` }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    accent-{step}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div
              className="flex h-20 items-center justify-center rounded-lg text-sm font-medium text-[#0a0a0a]"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              bg-gradient-brand (chrome)
            </div>
            <div
              className="flex h-20 items-center justify-center rounded-lg text-sm font-medium text-primary-foreground"
              style={{ backgroundImage: "var(--gradient-brand-red)" }}
            >
              bg-gradient-brand-red (CTA)
            </div>
          </div>
        </Showcase>

        <Showcase title="Logo">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <code className="text-xs text-muted-foreground">full / sm</code>
            </div>
            <div className="flex items-center gap-3">
              <Logo size="md" />
              <code className="text-xs text-muted-foreground">full / md</code>
            </div>
            <div className="flex items-center gap-3">
              <Logo size="lg" />
              <code className="text-xs text-muted-foreground">full / lg</code>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-end gap-6">
            <div className="flex flex-col items-center gap-2">
              <Logo variant="mark" size="sm" />
              <code className="text-xs text-muted-foreground">mark / sm</code>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Logo variant="mark" size="md" />
              <code className="text-xs text-muted-foreground">mark / md</code>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Logo variant="mark" size="lg" />
              <code className="text-xs text-muted-foreground">mark / lg</code>
            </div>
          </div>
          <div className="mt-8 border-t border-border pt-6">
            <p className="mb-4 text-xs text-muted-foreground">
              Con asset reale (<code>src=&quot;/logo-sdf.png&quot;</code>):
            </p>
            <div className="flex flex-wrap items-end gap-8">
              <div className="flex flex-col items-center gap-2">
                <Logo variant="mark" size="sm" src="/logo-sdf.png" />
                <code className="text-xs text-muted-foreground">mark / sm</code>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Logo variant="mark" size="md" src="/logo-sdf.png" />
                <code className="text-xs text-muted-foreground">mark / md</code>
              </div>
              <div className="flex flex-col items-center gap-2">
                <Logo variant="mark" size="lg" src="/logo-sdf.png" />
                <code className="text-xs text-muted-foreground">mark / lg</code>
              </div>
            </div>
          </div>
        </Showcase>

        <Showcase title="StatCard">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Pazienti attivi"
              value="128"
              delta={8.4}
              trend={sparkUp}
            />
            <StatCard
              label="Massimali 1RM"
              value="312"
              unit="kg"
              delta={-2.1}
              trend={sparkDown}
              invertDelta
            />
            <StatCard label="Aderenza" value="94%" delta={0} />
            <StatCard label="Caricamento…" value="—" loading />
          </div>
        </Showcase>

        <Showcase title="SectionHeader">
          <SectionHeader
            title="Atleti seguiti"
            subtitle="Ultimi aggiornamenti della settimana."
            action={
              <Button variant="outline" size="sm">
                Vedi tutti
              </Button>
            }
          />
          <div className="mt-6">
            <SectionHeader
              title="Senza sottotitolo"
              action={<span className="chip chip-red">beta</span>}
            />
          </div>
        </Showcase>

        <Showcase title="EmptyState">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              icon={Inbox}
              title="Nessuna nuova notifica"
              description="Tutto in ordine. Ti avviseremo quando ci sarà qualcosa di importante."
            />
            <EmptyState
              icon={Users}
              title="Ancora nessun paziente"
              description="Invita il primo atleta per iniziare a monitorare progressi e carichi."
              action={
                <Button size="sm">
                  <Plus />
                  Invita atleta
                </Button>
              }
            />
          </div>
        </Showcase>

        <Showcase title="MetricRing">
          <div className="flex flex-wrap items-center gap-10">
            <MetricRing
              value={0.74}
              label="74%"
              sublabel="aderenza"
              ariaLabel="Aderenza 74 percento"
            />
            <MetricRing
              value={180}
              max={200}
              size={140}
              strokeWidth={12}
              label="180"
              sublabel="kg panca"
            />
            <MetricRing
              value={0.25}
              size={88}
              strokeWidth={8}
              label="25%"
            />
            <MetricRing value={0} size={88} strokeWidth={8} label="0%" />
            <MetricRing value={1} size={88} strokeWidth={8} label="100%" />
          </div>
        </Showcase>

        <Showcase title="Divider">
          <div className="space-y-6">
            <Divider />
            <Divider label="oggi" />
            <Divider label="— ieri —" />
          </div>
        </Showcase>

        <Showcase title="Elevation & surfaces">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="surface-1 p-5">
              <p className="text-sm font-medium">surface-1</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Flat card, bordo subtle.
              </p>
            </div>
            <div className="surface-2 p-5">
              <p className="text-sm font-medium">surface-2</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Elevata, shadow-md + bordo gold 8%.
              </p>
            </div>
            <div className="surface-glass p-5">
              <p className="text-sm font-medium">surface-glass</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Backdrop-blur per overlay / sticky.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(["shadow-sm", "shadow-md", "shadow-lg"] as const).map((s) => (
              <div
                key={s}
                className={`rounded-xl bg-card p-5 ${s} border border-border`}
              >
                <code className="text-xs text-muted-foreground">{s}</code>
              </div>
            ))}
          </div>
        </Showcase>

        <Showcase title="Semantic icons">
          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-2 text-success">
              <HeartPulse className="h-4 w-4" /> success
            </span>
            <span className="inline-flex items-center gap-2 text-warning">
              <Activity className="h-4 w-4" /> warning
            </span>
            <span className="inline-flex items-center gap-2 text-info">
              <Dumbbell className="h-4 w-4" /> info
            </span>
          </div>
        </Showcase>
      </div>
    </div>
  );
}

function Showcase({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-display text-xl text-muted-foreground">{title}</h2>
      <div className="rounded-xl border border-border bg-card/30 p-6">
        {children}
      </div>
    </section>
  );
}
