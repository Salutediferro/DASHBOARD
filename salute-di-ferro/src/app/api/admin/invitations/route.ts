import { NextResponse } from "next/server";
import type { InvitationStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";

const STATUSES: InvitationStatus[] = [
  "PENDING",
  "ACCEPTED",
  "EXPIRED",
  "REVOKED",
];

/**
 * GET /api/admin/invitations
 *
 * Admin view over *all* invitations across every professional, with the
 * same expired-sweep side-effect as the per-professional GET so the status
 * column in the admin list is never stale.
 *
 * Filters: status, professionalId, free-text q (email / first / last /
 * professional name). Offset-paginated (30/page, max 100).
 */
export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");
    const status =
      statusParam && (STATUSES as readonly string[]).includes(statusParam)
        ? (statusParam as InvitationStatus)
        : undefined;
    const professionalId =
      searchParams.get("professionalId")?.trim() || undefined;
    const q = searchParams.get("q")?.trim() || undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const perPage = Math.min(
      100,
      Math.max(5, Number(searchParams.get("perPage") ?? "30")),
    );

    // One-pass sweep of every professional's expired invites — cheap and
    // means the UI never has to reason about "PENDING but past expiresAt".
    await prisma.invitation.updateMany({
      where: { status: "PENDING", expiresAt: { lt: new Date() } },
      data: { status: "EXPIRED" },
    });

    const where: Prisma.InvitationWhereInput = {
      ...(status ? { status } : {}),
      ...(professionalId ? { professionalId } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              {
                professional: {
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

    const [items, total, statusCounts] = await Promise.all([
      prisma.invitation.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          note: true,
          professionalRole: true,
          status: true,
          expiresAt: true,
          createdAt: true,
          usedAt: true,
          professional: {
            select: { id: true, fullName: true, email: true },
          },
          usedBy: { select: { id: true, fullName: true, email: true } },
        },
      }),
      prisma.invitation.count({ where }),
      prisma.invitation.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ]);

    const counts: Record<InvitationStatus, number> = {
      PENDING: 0,
      ACCEPTED: 0,
      EXPIRED: 0,
      REVOKED: 0,
    };
    for (const row of statusCounts) counts[row.status] = row._count._all;

    return NextResponse.json({ items, total, page, perPage, counts });
  } catch (e) {
    return errorResponse(e);
  }
}
