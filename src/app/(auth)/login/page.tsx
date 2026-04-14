import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Accedi — Salute di Ferro" };

export default function LoginPage() {
  return (
    <Suspense>
      <AuthForm variant="login" />
    </Suspense>
  );
}
