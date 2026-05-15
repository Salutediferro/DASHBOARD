/**
 * /dashboard/patient/agente/chat · pagina chat conversazionale Agente di Ferro
 *
 * La dashboard proattiva vive in /dashboard/patient/agente (parent). Questa
 * pagina ospita la chat (componente client `AgenteFerroChat`) raggiunta dai
 * CTA della dashboard o tramite deeplink.
 *
 * Auth/feature-flag identici alla parent.
 *
 * NOTE: `AgenteFerroChat` non accetta `initialQuery` nella sua firma corrente
 * (`interface Props { className?: string }`). Il searchParams `q` viene letto
 * ma ignorato lato render — predisposto per futura estensione del componente
 * chat (fuori scope di questo refactor).
 */

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isAgenteFerroEnabled } from "@/features/agente-ferro/lib";
import { AgenteFerroChat } from "@/features/agente-ferro/components";

export const metadata = {
  title: "Chat — Agente di Ferro",
};

export default async function AgenteFerroChatPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  // Consumiamo searchParams per future estensioni (es. prompt deeplink).
  await searchParams;

  if (!isAgenteFerroEnabled()) redirect("/dashboard/patient");

  const isDevBypass =
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_DEV_BYPASS === "1";

  if (!isDevBypass) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const me = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });
    if (!me) redirect("/login");
    if (me.role !== "PATIENT" && me.role !== "ADMIN") redirect("/dashboard");
  }

  return <AgenteFerroChat />;
}
