import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ROLE_HOME: Record<string, string> = {
  ADMIN: "/dashboard/admin",
  DOCTOR: "/dashboard/doctor",
  COACH: "/dashboard/coach",
  PATIENT: "/dashboard/client",
};

export default async function DashboardIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Prefer DB role (source of truth); fall back to app_metadata hint.
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  const role =
    dbUser?.role ??
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);

  if (role && ROLE_HOME[role]) redirect(ROLE_HOME[role]);

  // No role on record — send to register to complete onboarding.
  redirect("/register");
}
