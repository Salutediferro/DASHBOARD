import Link from "next/link";
import { Plus } from "lucide-react";
import { ComingSoon } from "@/components/scaffold/coming-soon";

export default function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Link
          href="/dashboard/admin/users/new"
          className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
        >
          <Plus className="h-4 w-4" />
          Nuovo utente
        </Link>
      </div>
      <ComingSoon
        title="Utenti"
        description="Gestione degli account della piattaforma"
        body="La lista utenti con filtri e azioni verrà abilitata nei prossimi moduli. Per ora puoi creare un nuovo DOCTOR o COACH cliccando qui sopra."
      />
    </div>
  );
}
