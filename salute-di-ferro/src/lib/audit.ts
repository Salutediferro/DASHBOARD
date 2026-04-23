import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/audit-actions";

export { AUDIT_ACTIONS, type AuditAction };

export type AuditParams = {
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown>;
  /** Pass the full Request to auto-extract IP + UA. */
  request?: Request;
};

/**
 * Append a row to the AuditLog table. Best-effort: audit failures MUST NOT
 * break the originating request, so any DB error is swallowed and logged
 * to stderr. The row shape is stable so it can be filtered/exported for
 * GDPR Art. 30 "record of processing activities" requests.
 */
export async function logAudit(params: AuditParams): Promise<void> {
  let ipAddress: string | null = null;
  let userAgent: string | null = null;
  if (params.request) {
    const h = params.request.headers;
    ipAddress =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    userAgent = h.get("user-agent") ?? null;
  }

  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        metadata: (params.metadata ?? null) as never,
        ipAddress,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] insert failed", {
      action: params.action,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
