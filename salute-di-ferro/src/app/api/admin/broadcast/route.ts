import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  clearBroadcast,
  getBroadcast,
  setBroadcast,
} from "@/lib/broadcast";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const putSchema = z.object({
  message: z.string().trim().min(3).max(280),
  severity: z.enum(["info", "warning", "critical"]),
  /** Optional ISO datetime. Null/undefined = no expiry. */
  expiresAt: z
    .string()
    .datetime({ offset: true })
    .optional()
    .nullable(),
});

/**
 * GET /api/admin/broadcast
 * Returns the stored broadcast regardless of expiry (admin UI needs to
 * see "scaduto" so they can decide to clear or re-publish).
 */
export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const broadcast = await getBroadcast();
    return NextResponse.json({ broadcast });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * PUT /api/admin/broadcast
 * Set / replace the active broadcast. Body: `{ message, severity,
 * expiresAt? }`.
 */
export async function PUT(req: Request) {
  try {
    const me = await requireRole(["ADMIN"]);

    const rl = await rateLimit({
      key: `admin-broadcast:${me.id}`,
      limit: 20,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Troppi aggiornamenti, riprova più tardi" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
        },
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Body non valido", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    // Fetch the actor's full name for the Broadcast.activatedBy field —
    // we want the banner to carry the human label, not just an opaque id.
    const author = await prisma.user.findUnique({
      where: { id: me.id },
      select: { fullName: true },
    });
    if (!author) {
      return NextResponse.json(
        { error: "Profile mancante" },
        { status: 404 },
      );
    }

    const result = await setBroadcast({
      message: parsed.data.message,
      severity: parsed.data.severity,
      expiresAt: parsed.data.expiresAt ?? null,
      activatedBy: { id: me.id, fullName: author.fullName },
    });
    if (!result.ok || !result.broadcast) {
      return NextResponse.json(
        { error: result.error ?? "Scrittura fallita" },
        { status: 502 },
      );
    }

    await logAudit({
      actorId: me.id,
      action: "BROADCAST_SET",
      entityType: "Broadcast",
      metadata: {
        message: parsed.data.message,
        severity: parsed.data.severity,
        expiresAt: parsed.data.expiresAt ?? null,
      },
      request: req,
    });

    return NextResponse.json({ ok: true, broadcast: result.broadcast });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * DELETE /api/admin/broadcast
 * Clear the current broadcast.
 */
export async function DELETE(req: Request) {
  try {
    const me = await requireRole(["ADMIN"]);
    const result = await clearBroadcast();
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Cancellazione fallita" },
        { status: 502 },
      );
    }
    await logAudit({
      actorId: me.id,
      action: "BROADCAST_CLEAR",
      entityType: "Broadcast",
      request: req,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
