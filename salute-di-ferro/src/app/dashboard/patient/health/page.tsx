import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { HealthTabs } from "@/components/health/health-tabs";

export const metadata = { title: "Dati salute — Salute di Ferro" };
export const dynamic = "force-dynamic";

export default async function PatientHealthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      role: true,
      targetWeightKg: true,
      heightCm: true,
      sex: true,
    },
  });
  if (!me) redirect("/login");
  if (me.role !== "PATIENT") redirect("/dashboard");

  return (
    <HealthTabs
      profile={{
        targetWeightKg: me.targetWeightKg,
        heightCm: me.heightCm,
        sex: me.sex,
      }}
    />
  );
}
