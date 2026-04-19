import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ClipboardCheck,
  FileText,
  HeartPulse,
  MessageSquare,
  Pill,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import Logo from "@/components/brand/logo";

export const metadata = {
  title: "Salute di Ferro — La tua centrale salute",
  description:
    "Piattaforma sanitaria che collega pazienti, medici e coach. Cartella clinica, appuntamenti, check-in e messaggi in un unico spazio sicuro.",
};

export default function LandingPage() {
  return (
    <main className="bg-background flex min-h-screen flex-col">
      <NavBar />
      <Hero />
      <Features />
      <HowItWorks />
      <Trust />
      <FAQ />
      <Footer />
    </main>
  );
}

function NavBar() {
  return (
    <header className="border-border sticky top-0 z-40 flex h-16 items-center justify-between border-b bg-background/80 px-6 backdrop-blur">
      <Link href="/" className="flex items-center gap-2">
        <Logo variant="mark" size="md" src="/logo-sdf.png" />
        <span className="text-sm font-semibold tracking-tight">
          Salute di Ferro
        </span>
      </Link>
      <nav className="hidden gap-8 text-sm md:flex">
        <a
          href="#features"
          className="text-muted-foreground hover:text-foreground"
        >
          Funzionalità
        </a>
        <a href="#how" className="text-muted-foreground hover:text-foreground">
          Come funziona
        </a>
        <a href="#faq" className="text-muted-foreground hover:text-foreground">
          FAQ
        </a>
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="ghost" size="sm">
            Accedi
          </Button>
        </Link>
        <Link href="/register">
          <Button size="sm">Inizia</Button>
        </Link>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center gap-8 px-6 py-24 text-center">
      <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-xs font-medium">
        Piattaforma sanitaria · GDPR Art. 9
      </span>
      <h1 className="font-heading max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
        La tua centrale salute,{" "}
        <span className="text-primary">al sicuro</span>
      </h1>
      <p className="text-muted-foreground max-w-2xl text-lg">
        Cartella clinica, appuntamenti, check-in settimanali e messaggi
        diretti con medici e coach. Tutto in un unico spazio, cifrato e
        conforme al GDPR.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link href="/register">
          <Button size="lg" className="gap-2">
            Inizia gratis
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/login">
          <Button variant="outline" size="lg">
            Ho già un account
          </Button>
        </Link>
      </div>
      <p className="text-muted-foreground text-xs">
        Registrazione gratuita · Dati protetti su server UE
      </p>
    </section>
  );
}

const FEATURES = [
  {
    icon: ClipboardCheck,
    title: "Cartella clinica digitale",
    desc: "Carica referti, analisi e visite. Solo tu decidi quali professionisti possono vederli.",
  },
  {
    icon: Calendar,
    title: "Appuntamenti in un clic",
    desc: "Prenota consulti con il tuo medico o coach. Reminder automatici e sincronizzazione calendario.",
  },
  {
    icon: HeartPulse,
    title: "Dati salute sempre aggiornati",
    desc: "Peso, pressione, glicemia, sonno. Trend visivi e contesto per ogni misurazione.",
  },
  {
    icon: MessageSquare,
    title: "Chat diretta col tuo team",
    desc: "Una domanda veloce al medico o al coach. Messaggi 1:1 protetti e tracciabili.",
  },
  {
    icon: Pill,
    title: "Terapia in corso",
    desc: "Farmaci, dosaggi e durate strutturati. Il tuo team ha sempre il quadro completo.",
  },
  {
    icon: FileText,
    title: "Dossier esportabile",
    desc: "Scarica un PDF leggibile con tutti i tuoi dati, pronto da portare da qualsiasi medico.",
  },
];

function Features() {
  return (
    <section
      id="features"
      className="border-border/50 border-t bg-card/30 px-6 py-24"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Funzionalità
          </span>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Tutto quello che serve per gestire la tua salute
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="border-border bg-card flex flex-col gap-3 rounded-xl border p-6"
            >
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    n: "1",
    icon: UserRound,
    title: "Registrati",
    desc: "Crea il tuo account paziente in 2 minuti. Email + password, nessuna carta richiesta.",
  },
  {
    n: "2",
    icon: Stethoscope,
    title: "Collega il tuo team",
    desc: "Il tuo medico o coach ti invita con un link. L'accesso ai tuoi dati è sempre sotto il tuo controllo.",
  },
  {
    n: "3",
    icon: HeartPulse,
    title: "Vivi la salute nel quotidiano",
    desc: "Check-in settimanali, referti, messaggi e appuntamenti. Il tuo team ha il contesto sempre aggiornato.",
  },
];

function HowItWorks() {
  return (
    <section id="how" className="px-6 py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Come funziona
          </span>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Tre passaggi, e sei al centro della tua salute
          </h2>
        </div>
        <ol className="grid gap-6 md:grid-cols-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="border-border bg-card flex flex-col gap-4 rounded-xl border p-6"
            >
              <div className="flex items-center justify-between">
                <div className="bg-primary/15 text-primary flex h-10 w-10 items-center justify-center rounded-full font-mono text-sm font-bold">
                  {s.n}
                </div>
                <s.icon className="text-muted-foreground h-5 w-5" />
              </div>
              <h3 className="font-semibold">{s.title}</h3>
              <p className="text-muted-foreground text-sm">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const TRUST_POINTS = [
  {
    icon: ShieldCheck,
    title: "GDPR Art. 9",
    desc: "Dati sanitari cifrati at-rest e in-transit, server in UE, trattamento con consenso esplicito.",
  },
  {
    icon: ShieldCheck,
    title: "2FA per i professionisti",
    desc: "Medici e coach accedono con autenticazione a due fattori. La tua cartella è blindata.",
  },
  {
    icon: ShieldCheck,
    title: "Controllo granulare",
    desc: "Decidi tu chi vede quali referti. Revoca l'accesso in qualsiasi momento.",
  },
];

function Trust() {
  return (
    <section className="border-border/50 border-t bg-card/30 px-6 py-24">
      <div className="mx-auto flex max-w-5xl flex-col gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            Privacy & Sicurezza
          </span>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            I tuoi dati sono tuoi
          </h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {TRUST_POINTS.map((t) => (
            <div key={t.title} className="flex flex-col gap-3">
              <div className="bg-primary/10 text-primary flex h-10 w-10 items-center justify-center rounded-md">
                <t.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold">{t.title}</h3>
              <p className="text-muted-foreground text-sm">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Quanto costa Salute di Ferro?",
    a: "La registrazione paziente è gratuita. Le prestazioni sanitarie (visite, consulti) sono a tariffa del singolo professionista.",
  },
  {
    q: "I miei dati sono al sicuro?",
    a: "Sì. Dati cifrati, server UE, conformità GDPR Art. 9 per dati sanitari. Puoi esportare o eliminare tutto in qualsiasi momento dal tuo profilo.",
  },
  {
    q: "Chi vede i miei referti?",
    a: "Nessuno, se non lo decidi tu. Puoi dare accesso a singoli referti a un medico o coach, e revocarlo quando vuoi.",
  },
  {
    q: "Sono un medico o coach. Come mi registro?",
    a: "I professionisti accedono su invito. Scrivici a info@salutediferro.com per iniziare l'onboarding.",
  },
  {
    q: "Salute di Ferro sostituisce il mio medico?",
    a: "No. È uno strumento che ti aiuta a gestire la salute in modo più organizzato con il tuo team. Per emergenze chiama il 112.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="px-6 py-24">
      <div className="mx-auto flex max-w-3xl flex-col gap-12">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
            FAQ
          </span>
          <h2 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
            Domande frequenti
          </h2>
        </div>
        <div className="divide-border flex flex-col divide-y">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-medium">
                {f.q}
                <span className="text-muted-foreground transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-border border-t px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center text-xs">
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/privacy"
            className="text-muted-foreground hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/cookie-policy"
            className="text-muted-foreground hover:text-foreground"
          >
            Cookie
          </Link>
          <Link
            href="/terms"
            className="text-muted-foreground hover:text-foreground"
          >
            Termini
          </Link>
          <Link
            href="/subprocessors"
            className="text-muted-foreground hover:text-foreground"
          >
            Sub-responsabili
          </Link>
          <a
            href="mailto:info@salutediferro.com"
            className="text-muted-foreground hover:text-foreground"
          >
            Contatti
          </a>
        </div>
        <p className="text-muted-foreground">
          © {new Date().getFullYear()} Salute di Ferro. Tutti i diritti
          riservati.
        </p>
      </div>
    </footer>
  );
}
