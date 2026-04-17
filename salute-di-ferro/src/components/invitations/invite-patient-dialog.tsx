"use client";

import * as React from "react";
import { toast } from "sonner";
import { Copy, Check, Loader2, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type InviteCreated = {
  id: string;
  token: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  expiresAt: string;
  emailStatus?: "sent" | "skipped" | "failed";
  emailError?: string;
};

/**
 * "Invita paziente" dialog for DOCTOR and COACH dashboards.
 *
 * The dialog has two states:
 *   1. Form    — email / nome / cognome / note optional. Submit → POST /api/invitations.
 *   2. Result  — shows the generated URL with a Copy button.
 *
 * The caller's role is not in the body: the server derives it from the
 * authenticated user (COACH → COACH invite, DOCTOR → DOCTOR invite).
 */
export function InvitePatientDialog({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [invite, setInvite] = React.useState<InviteCreated | null>(null);
  const [copied, setCopied] = React.useState(false);

  function reset() {
    setInvite(null);
    setCopied(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const body = {
      email: String(fd.get("email") ?? "").trim(),
      firstName: String(fd.get("firstName") ?? "").trim(),
      lastName: String(fd.get("lastName") ?? "").trim(),
      note: String(fd.get("note") ?? "").trim(),
    };
    setLoading(true);
    try {
      const res = await fetch("/api/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error("Impossibile creare l'invito", {
          description:
            typeof err?.error === "string" ? err.error : "Riprova più tardi",
        });
        return;
      }
      const created = (await res.json()) as InviteCreated;
      setInvite(created);
      form.reset();
      onCreated?.();
    } finally {
      setLoading(false);
    }
  }

  const inviteUrl = invite
    ? `${
        typeof window !== "undefined" ? window.location.origin : ""
      }/register?invite=${invite.token}`
    : "";

  async function copy() {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      toast.success("Link copiato");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copia non riuscita, copia manualmente il link");
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) reset();
      }}
    >
      <DialogTrigger
        render={
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Invita paziente
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        {!invite ? (
          <>
            <DialogHeader>
              <DialogTitle>Invita un nuovo paziente</DialogTitle>
              <DialogDescription>
                Genera un link di registrazione personale. Chi lo usa viene
                assegnato automaticamente a te.
              </DialogDescription>
            </DialogHeader>
            <form
              className="flex flex-col gap-4"
              id="invite-form"
              onSubmit={handleSubmit}
            >
              <div className="grid gap-2">
                <Label htmlFor="email">Email (opzionale)</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="paziente@example.com"
                  autoComplete="off"
                />
                <p className="text-muted-foreground text-xs">
                  Se indicata, verrà pre-compilata in fase di registrazione.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">Nome (opzionale)</Label>
                  <Input id="firstName" name="firstName" autoComplete="off" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Cognome (opzionale)</Label>
                  <Input id="lastName" name="lastName" autoComplete="off" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="note">Note interne (opzionale)</Label>
                <Textarea
                  id="note"
                  name="note"
                  rows={2}
                  maxLength={500}
                  placeholder="Visibile solo a te"
                />
              </div>
            </form>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>
                Annulla
              </DialogClose>
              <Button
                type="submit"
                form="invite-form"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Genera link
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Link di invito pronto</DialogTitle>
              <DialogDescription>
                Invialo al paziente. Vale fino al{" "}
                {new Date(invite.expiresAt).toLocaleDateString("it-IT")}.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={inviteUrl}
                  className="font-mono text-xs"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={copy}
                  aria-label="Copia link"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {invite.email && (
                <p className="text-muted-foreground text-xs">
                  {invite.emailStatus === "sent" ? (
                    <>
                      ✓ Email inviata a <strong>{invite.email}</strong>
                    </>
                  ) : invite.emailStatus === "failed" ? (
                    <>
                      ⚠ Invio email fallito a <strong>{invite.email}</strong>.
                      Copia il link e inviaglielo a mano.
                    </>
                  ) : (
                    <>
                      Email pre-compilata: <strong>{invite.email}</strong>
                    </>
                  )}
                </p>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Crea un altro invito
              </Button>
              <DialogClose render={<Button />}>Chiudi</DialogClose>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
