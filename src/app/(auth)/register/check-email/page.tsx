import { Suspense } from "react";
import { CheckEmailContent } from "./check-email-content";

export const metadata = { title: "Controlla la tua email — Salute di Ferro" };

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailContent />
    </Suspense>
  );
}
