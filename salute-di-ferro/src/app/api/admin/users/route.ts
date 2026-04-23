import { NextResponse } from "next/server";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { errorResponse, requireRole } from "@/lib/auth/require-role";

const ROLES: UserRole[] = ["ADMIN", "DOCTOR", "COACH", "PATIENT"];

export async function GET(req: Request) {
  try {
    await requireRole(["ADMIN"]);

    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim() || undefined;
    const roleParam = searchParams.get("role");
    const role =
      roleParam && ROLES.includes(roleParam as UserRole)
        ? (roleParam as UserRole)
        : undefined;
    const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
    const perPage = Math.min(
      100,
      Math.max(5, Number(searchParams.get("perPage") ?? "30")),
    );

    const where: Prisma.UserWhereInput = {
      ...(role ? { role } : {}),
      ...(q
        ? {
            OR: [
              { fullName: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [items, total, byRole] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          email: true,
          fullName: true,
          role: true,
          avatarUrl: true,
          phone: true,
          createdAt: true,
          deletedAt: true,
          onboardingCompleted: true,
          organization: { select: { id: true, name: true } },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.groupBy({
        by: ["role"],
        _count: { _all: true },
      }),
    ]);

    const counts: Record<UserRole, number> = {
      ADMIN: 0,
      DOCTOR: 0,
      COACH: 0,
      PATIENT: 0,
    };
    for (const row of byRole) counts[row.role] = row._count._all;

    return NextResponse.json({
      items,
      total,
      page,
      perPage,
      counts,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
