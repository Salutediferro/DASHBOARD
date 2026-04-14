import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardIndex() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const metaRole =
    (user.app_metadata?.role as string | undefined) ??
    (user.user_metadata?.role as string | undefined);

  let role = metaRole;
  if (!role) {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    role = dbUser?.role;
  }

  if (role === "COACH" || role === "ADMIN") redirect("/dashboard/coach");
  if (role === "CLIENT") redirect("/dashboard/client");

  // No profile yet — send to register to complete onboarding.
  redirect("/register");
}
