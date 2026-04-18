"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/hooks/use-user";

const CONFIRM_PHRASE = "ELIMINA";

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
    confirm.trim().toUpperCase() === CONFIRM_PHRASE && !deleteMutation.isPending;

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive flex items-center gap-2 text-base">
          <AlertTriangle className="h-4 w-4" />
          Eliminazione account
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-muted-foreground text-sm">
          Elimina il tuo account e revoca subito l&apos;accesso di medici e
          coach ai tuoi referti. I dati vengono conservati 30 giorni per
          motivi legali e audit, poi rimossi definitivamente.
        </p>
        {profile?.email && (
          <p className="text-muted-foreground text-xs">
            Account:{" "}
            <span className="text-foreground font-medium">{profile.email}</span>
          </p>
        )}
        <Dialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setConfirm("");
          }}
        >
          <DialogTrigger
            className="text-destructive hover:bg-destructive/10 border-destructive/40 inline-flex h-10 w-fit items-center gap-2 rounded-md border px-4 text-sm font-medium"
          >
            <Trash2 className="h-4 w-4" />
            Elimina il mio account
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confermi di eliminare l&apos;account?</DialogTitle>
              <DialogDescription>
                Azione irreversibile. Verrai disconnesso, i tuoi professionisti
                perderanno l&apos;accesso ai referti e i file nel bucket saranno
                rimossi. Conservazione 30 giorni per i soli obblighi legali.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2 py-2">
              <Label htmlFor="confirm">
                Scrivi <span className="font-mono font-semibold">{CONFIRM_PHRASE}</span>{" "}
                per confermare
              </Label>
              <Input
                id="confirm"
                autoComplete="off"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={CONFIRM_PHRASE}
              />
            </div>
            <DialogFooter>
              <DialogClose className="hover:bg-muted inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium">
                Annulla
              </DialogClose>
              <button
                type="button"
                disabled={!canConfirm}
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium disabled:opacity-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Elimina definitivamente
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
