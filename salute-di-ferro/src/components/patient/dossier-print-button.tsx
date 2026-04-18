"use client";

import { Download } from "lucide-react";

export function DossierPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium"
    >
      <Download className="h-4 w-4" />
      Scarica PDF
    </button>
  );
}
