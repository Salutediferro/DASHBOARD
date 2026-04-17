import { Suspense } from "react";
import { CheckEmailCard } from "./check-email-card";

export const metadata = { title: "Controlla la tua email — Salute di Ferro" };

export default function CheckEmailPage() {
  return (
    <Suspense>
      <CheckEmailCard />
    </Suspense>
  );
}
