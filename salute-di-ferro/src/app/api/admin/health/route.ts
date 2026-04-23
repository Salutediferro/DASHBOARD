import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { pingRedis } from "@/lib/rate-limit";
import { errorResponse, requireRole } from "@/lib/auth/require-role";

/**
 * GET /api/admin/health
 *
 * Admin-only liveness probe across every external dependency the app can't
 * run without, plus a few cheap system stats for at-a-glance triage.
 *
 * Each check is isolated in its own try/catch and runs in parallel — a
 * single slow/down dependency won't block the others, and the admin sees
 * a partial green/red heatmap instead of a single 500.
 *
 * What this endpoint is NOT: a full SLA dashboard. Recent-errors from
 * Sentry would need the Sentry REST API (separate auth token, out of
 * scope here). Cron "last run at" isn't stored anywhere yet, so we only
 * report whether the secret is configured.
 */
export const dynamic = "force-dynamic";

type Check = {
  ok: boolean;
  configured: boolean;
  latencyMs: number | null;
  error?: string;
  detail?: string;
};

async function checkPrisma(): Promise<Check> {
  const started = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      ok: true,
      configured: !!process.env.DATABASE_URL,
      latencyMs: Date.now() - started,
    };
  } catch (e) {
    return {
      ok: false,
      configured: !!process.env.DATABASE_URL,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkSupabaseAuth(): Promise<Check> {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!configured) {
    return { ok: false, configured: false, latencyMs: null };
  }
  const started = Date.now();
  try {
    const admin = createAdminClient();
    // listUsers with perPage=1 is the cheapest authenticated call that
    // exercises both the service-role key and the Auth endpoint.
    const { error } = await admin.auth.admin.listUsers({ perPage: 1 });
    const latencyMs = Date.now() - started;
    if (error) {
      return { ok: false, configured: true, latencyMs, error: error.message };
    }
    return { ok: true, configured: true, latencyMs };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

async function checkSupabaseStorage(): Promise<Check> {
  const configured = !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  if (!configured) {
    return { ok: false, configured: false, latencyMs: null };
  }
  const started = Date.now();
  try {
    const admin = createAdminClient();
    // listBuckets is a no-arg admin call that fails loudly if the
    // service_role key lost storage permissions or the API is down.
    const { data, error } = await admin.storage.listBuckets();
    const latencyMs = Date.now() - started;
    if (error) {
      return { ok: false, configured: true, latencyMs, error: error.message };
    }
    return {
      ok: true,
      configured: true,
      latencyMs,
      detail: `${data?.length ?? 0} bucket`,
    };
  } catch (e) {
    return {
      ok: false,
      configured: true,
      latencyMs: Date.now() - started,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

function checkResend(): Check {
  const configured = !!(
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM
  );
  // Resend doesn't expose a ping endpoint. We *could* send a probe email
  // but that would burn quota and poison the inbox on every admin visit.
  // Configuration presence is the strongest signal we can get safely.
  return {
    ok: configured,
    configured,
    latencyMs: null,
    detail: configured ? process.env.EMAIL_FROM : "RESEND_API_KEY or EMAIL_FROM missing",
  };
}

function checkSentry(): Check {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  const configured = !!dsn;
  // Same story as Resend — Sentry's ingestion endpoint has no ping. We
  // only verify the DSN is present; actual event delivery happens async
  // and silently.
  return {
    ok: configured,
    configured,
    latencyMs: null,
    detail: configured ? "DSN configurato" : "SENTRY_DSN mancante",
  };
}

type CronStatus = {
  path: string;
  schedule: string;
  description: string;
  secretConfigured: boolean;
};

function listCrons(): CronStatus[] {
  const secretConfigured = !!process.env.CRON_SECRET;
  return [
    {
      path: "/api/cron/appointment-reminders",
      schedule: "0 8 * * *",
      description: "Promemoria appuntamenti (24h + 1h) — email via Resend",
      secretConfigured,
    },
    {
      path: "/api/cron/retention",
      schedule: "0 4 * * *",
      description:
        "Hard-delete utenti soft-deletati >30g, cleanup notifiche/inviti scaduti",
      secretConfigured,
    },
  ];
}

async function collectStats() {
  const [
    totalUsers,
    disabledUsers,
    totalAppointments,
    upcomingAppointments,
    totalAuditLogs,
    totalMedicalReports,
    totalInvitations,
    pendingInvitations,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { deletedAt: { not: null } } }),
    prisma.appointment.count(),
    prisma.appointment.count({ where: { startTime: { gte: new Date() } } }),
    prisma.auditLog.count(),
    prisma.medicalReport.count(),
    prisma.invitation.count(),
    prisma.invitation.count({ where: { status: "PENDING" } }),
  ]);
  return {
    totalUsers,
    disabledUsers,
    totalAppointments,
    upcomingAppointments,
    totalAuditLogs,
    totalMedicalReports,
    totalInvitations,
    pendingInvitations,
  };
}

export async function GET() {
  try {
    await requireRole(["ADMIN"]);

    // Kick off checks in parallel. A single slow provider shouldn't
    // serialize the others — the whole page is for at-a-glance triage.
    const [prismaCheck, authCheck, storageCheck, redisCheck, stats] =
      await Promise.all([
        checkPrisma(),
        checkSupabaseAuth(),
        checkSupabaseStorage(),
        pingRedis(),
        collectStats().catch(() => null),
      ]);

    const resendCheck = checkResend();
    const sentryCheck = checkSentry();

    const checks = {
      prisma: prismaCheck,
      supabaseAuth: authCheck,
      supabaseStorage: storageCheck,
      redis: {
        ok: redisCheck.ok,
        configured: redisCheck.configured,
        latencyMs: redisCheck.latencyMs,
        ...(redisCheck.error ? { error: redisCheck.error } : {}),
        ...(redisCheck.configured
          ? {}
          : { detail: "Fallback in-memory — non distribuito" }),
      } satisfies Check,
      resend: resendCheck,
      sentry: sentryCheck,
    };

    // Overall health is "all critical deps green". Resend/Sentry being
    // mis-configured is degraded but not down — the app still runs.
    const criticalOk =
      checks.prisma.ok && checks.supabaseAuth.ok && checks.supabaseStorage.ok;

    return NextResponse.json({
      ok: criticalOk,
      timestamp: new Date().toISOString(),
      checks,
      stats,
      crons: listCrons(),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
