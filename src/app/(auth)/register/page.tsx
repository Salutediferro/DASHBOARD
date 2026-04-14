import { Suspense } from "react";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = { title: "Registrati — Salute di Ferro" };

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm variant="register" />
    </Suspense>
  );
}
