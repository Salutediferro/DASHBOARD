import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { AUDIT_ACTIONS, type AuditAction } from "@/lib/audit";
import { errorResponse, requireRole } from "@/lib/auth/require-role";

const CSV_MAX_ROWS = 10_000;

type AuditRow = {
  id: string;
  createdAt: Date;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  metadata: Prisma.JsonValue;
  actor: { id: string; email: string; fullName: string } | null;
};

function parseDate(raw: string | null): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function buildWhere(searchParams: URLSearchParams): Prisma.AuditLogWhereInput {
  const q = searchParams.get("q")?.trim() || undefined;
  const actionParam = searchParams.get("action");
  const action =
    actionParam && (AUDIT_ACTIONS as readonly string[]).includes(actionParam)
      ? (actionParam as AuditAction)
      : undefined;
  const actorId = searchParams.get("actorId")?.trim() || undefined;
  const entityType = searchParams.get("entityType")?.trim() || undefined;
  const from = parseDate(searchParams.get("from"));
  const to = parseDate(searchParams.get("to"));

  // `to` is inclusive of the whole day when a plain YYYY-MM-DD is passed,
  // so bump it to end-of-day so "today" filters match late entries.
  const toInclusive = to
    ? new Date(to.getTime() + 24 * 60 * 60 * 1000 - 1)
    : undefined;

  return {
    ...(action ? { action } : {}),
    ...(actorId ? { actorId } : {}),
    ...(entityType ? { entityType } : {}),
    ...(from || toInclusive
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(toInclusive ? { lte: toInclusive } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { action: { contains: q, mode: "insensitive" } },
            { entityType: { contains: q, mode: "insensitive" } },
            { entityId: { contains: q, mode: "insensitive" } },
            {
              actor: {
                is: {
                  OR: [
                    { fullName: { contains: q, mode: "insensitive" } },
                    { email: { contains: q, mode: "insensitive" } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : JSON.stringify(value);
  // RFC 4180: quote if contains comma, quote, or newline; double inner quotes.
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function rowsToCsv(rows: AuditRow[]): string {
  const header = [
    "timestamp",
    "actor_id",
    "actor_email",
    "actor_name",
    "action",
    "entity_type",
    "entity_id",
    "ip_address",
    "user_agent",
    "metadata",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [
        r.createdAt.toISOString(),
        r.actor?.id ?? "",
        r.actor?.email ?? "",
        r.actor?.fullName ?? "",
        r.action,
        r.entityType,
        r.entityId ?? "",
        r.ipAddress ?? "",
        r.userAgent ?? "",
        r.metadata ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }
  return lines.join("\n");
}

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const where = buildWhere(searchParams);
    const format = searchParams.get("format");

    if (format === "csv") {
      const rows = await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: CSV_MAX_ROWS,
        include: {
          actor: { select: { id: true, email: true, fullName: true } },
        },
      });
      const csv = rowsToCsv(rows);
      const stamp = new Date().toISOString().slice(0, 10);
      return new NextResponse(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="audit-${stamp}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    }

    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const perPage = Math.min(
      100,
      Math.max(5, Number(searchParams.get("perPage") ?? "30")),
    );

    const [items, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          actor: { select: { id: true, email: true, fullName: true } },
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      perPage,
      csvMaxRows: CSV_MAX_ROWS,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
