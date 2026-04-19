"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";

export function DangerZone() {
  const router = useRouter();
  const supabase = createClient();
  const { profile } = useUser();
  const [open, setOpen] = React.useState(false);
  const [confirm, setConfirm] = React.useState("");

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Errore durante l'eliminazione");
      }
      return res.json();
    },
    onSuccess: async () => {
      await supabase.auth.signOut();
      toast.success("Account eliminato");
      router.replace("/");
      router.refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const canConfirm =
    !!profile?.email &&
    confirm.trim().toLowerCase() === profile.email.toLowerCase() &&
    !deleteMutation.isPending;

  return (
    <section
      className="rounded-xl border border-destructive/30 bg-destructive/5 p-5"
      aria-labelledby="danger-heading"
    >
      <header className="flex items-center gap-2">
        <AlertTriangle
          className="h-4 w-4 text-destructive"
          aria-hidden
        />
        <h3 id="danger-heading" className="text-sm font-semibold text-destructive">
          Danger zone
        </h3>
      </header>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Elimina il tuo account e revoca subito l&apos;accesso di medici e coach
          ai tuoi dati. I file di riferimento vengono conservati{" "}
          <span className="text-foreground">30 giorni</span> per obblighi legali
          e audit, poi rimossi definitivamente.
        </p>
        {profile?.email && (
          <p className="text-xs text-muted-foreground">
            Account:{" "}
            <span className="font-medium text-foreground">{profile.email}</span>
          </p>
        )}
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setConfirm("");
          }}
        >
          <DialogTrigger className="focus-ring inline-flex h-10 w-fit items-center gap-2 rounded-md border border-destructive/40 px-4 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
            <Trash2 className="h-4 w-4" aria-hidden />
            Elimina il mio account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confermi di eliminare l&apos;account?</DialogTitle>
              <DialogDescription>
                Azione irreversibile. Verrai disconnesso, i tuoi professionisti
                perderanno subito l&apos;accesso ai referti e i file nel bucket
                saranno rimossi. Conservazione 30 giorni per i soli obblighi
                legali.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="danger-confirm-email">
                Per confermare, riscrivi la tua email:{" "}
                <span className="font-mono font-semibold">
                  {profile?.email ?? "—"}
                </span>
              </Label>
              <Input
                id="danger-confirm-email"
                type="email"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={profile?.email ?? "tua@email"}
                aria-invalid={
                  confirm.length > 0 && !canConfirm ? true : undefined
                }
                className="focus-ring"
              />
              {confirm.length > 0 && !canConfirm && (
                <p className="text-[11px] text-destructive">
                  L&apos;email non corrisponde.
                </p>
              )}
            </div>
            <DialogFooter>
              <DialogClose
                render={
                  <Button variant="outline" type="button">
                    Annulla
                  </Button>
                }
              />
              <Button
                type="button"
                variant="destructive"
                disabled={!canConfirm}
                onClick={() => deleteMutation.mutate()}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                )}
                Elimina definitivamente
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </section>
  );
}
