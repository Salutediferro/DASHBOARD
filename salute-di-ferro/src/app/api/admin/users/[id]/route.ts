import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";
import { purgeUserStorage } from "@/lib/user-retention";

const BAN_FOREVER = "876000h"; // 100 years — what Supabase docs use as "forever"

const patchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("DISABLE") }),
  z.object({ action: z.literal("RESTORE") }),
  z.object({ action: z.literal("RESET_PASSWORD") }),
  z.object({
    action: z.literal("CHANGE_ROLE"),
    role: z.enum(["ADMIN", "DOCTOR", "COACH", "PATIENT"]),
  }),
]);

const USER_SELECT = {
  id: true,
  email: true,
  fullName: true,
  firstName: true,
  lastName: true,
  role: true,
  avatarUrl: true,
  phone: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  onboardingCompleted: true,
  organization: { select: { id: true, name: true } },
} as const;

async function loadUser(id: string) {
  return prisma.user.findUnique({ where: { id }, select: USER_SELECT });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireRole(["ADMIN"]);
    const { id } = await params;
    const user = await loadUser(id);
    if (!user) {
      return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole(["ADMIN"]);
    const { id } = await params;

    // Per-admin throttle across all mutations on this endpoint. 60/hour is
    // plenty for normal ops and cheap insurance against an admin account
    // compromise that starts mass-disabling accounts.
    const rl = await rateLimit({
      key: `admin-user-mutation:${me.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Troppe modifiche, riprova più tardi" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
        },
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = patchSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Body non valido", issues: parsed.error.issues },
        { status: 400 },
      );
    }

    const target = await loadUser(id);
    if (!target) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 },
      );
    }

    // Guard: admin cannot disable themselves or change their own role — a
    // bricked admin with no recovery path is a production outage. Other
    // admins can still operate on each other so lockouts stay recoverable.
    const isSelf = target.id === me.id;
    const admin = createAdminClient();

    switch (parsed.data.action) {
      case "DISABLE": {
        if (isSelf) {
          return NextResponse.json(
            { error: "Non puoi disabilitare te stesso" },
            { status: 400 },
          );
        }
        if (target.deletedAt) {
          return NextResponse.json(
            { error: "Utente già disabilitato" },
            { status: 409 },
          );
        }
        // Ban at auth layer first — this kills existing sessions. Even if
        // the Prisma write below somehow fails, the user is already locked
        // out, which is the safer default.
        const { error: banErr } = await admin.auth.admin.updateUserById(id, {
          ban_duration: BAN_FOREVER,
        });
        if (banErr) {
          return NextResponse.json(
            { error: `Ban fallito: ${banErr.message}` },
            { status: 502 },
          );
        }
        const updated = await prisma.user.update({
          where: { id },
          data: { deletedAt: new Date() },
          select: USER_SELECT,
        });
        await logAudit({
          actorId: me.id,
          action: "USER_SOFT_DELETE",
          entityType: "User",
          entityId: id,
          metadata: { targetEmail: target.email, targetRole: target.role },
          request: req,
        });
        return NextResponse.json(updated);
      }

      case "RESTORE": {
        if (!target.deletedAt) {
          return NextResponse.json(
            { error: "Utente non è disabilitato" },
            { status: 409 },
          );
        }
        const { error: unbanErr } = await admin.auth.admin.updateUserById(id, {
          ban_duration: "none",
        });
        if (unbanErr) {
          return NextResponse.json(
            { error: `Unban fallito: ${unbanErr.message}` },
            { status: 502 },
          );
        }
        const updated = await prisma.user.update({
          where: { id },
          data: { deletedAt: null },
          select: USER_SELECT,
        });
        await logAudit({
          actorId: me.id,
          action: "USER_RESTORE",
          entityType: "User",
          entityId: id,
          metadata: { targetEmail: target.email, targetRole: target.role },
          request: req,
        });
        return NextResponse.json(updated);
      }

      case "CHANGE_ROLE": {
        const newRole = parsed.data.role;
        if (isSelf && newRole !== target.role) {
          return NextResponse.json(
            { error: "Non puoi cambiare il tuo ruolo" },
            { status: 400 },
          );
        }
        if (newRole === target.role) {
          return NextResponse.json(
            { error: "Il ruolo è già quello richiesto" },
            { status: 409 },
          );
        }
        // Mirror into auth app_metadata so the middleware can dispatch
        // without a DB round-trip. The Prisma row is the source of truth;
        // if the mirror fails we roll back DB to keep the two in sync.
        const updated = await prisma.user.update({
          where: { id },
          data: { role: newRole },
          select: USER_SELECT,
        });
        const { error: metaErr } = await admin.auth.admin.updateUserById(id, {
          app_metadata: { role: newRole },
        });
        if (metaErr) {
          await prisma.user.update({
            where: { id },
            data: { role: target.role },
          });
          return NextResponse.json(
            { error: `Sync auth metadata fallito: ${metaErr.message}` },
            { status: 502 },
          );
        }
        await logAudit({
          actorId: me.id,
          action: "USER_ROLE_CHANGE",
          entityType: "User",
          entityId: id,
          metadata: {
            targetEmail: target.email,
            fromRole: target.role,
            toRole: newRole,
          },
          request: req,
        });
        return NextResponse.json(updated);
      }

      case "RESET_PASSWORD": {
        if (target.deletedAt) {
          return NextResponse.json(
            { error: "Utente disabilitato: ripristinalo prima" },
            { status: 409 },
          );
        }
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
        const { data: linkData, error: linkErr } =
          await admin.auth.admin.generateLink({
            type: "recovery",
            email: target.email,
            options: baseUrl
              ? { redirectTo: `${baseUrl}/auth/callback` }
              : undefined,
          });
        if (linkErr || !linkData?.properties?.action_link) {
          return NextResponse.json(
            {
              error: `Generazione link fallita: ${
                linkErr?.message ?? "no action_link"
              }`,
            },
            { status: 502 },
          );
        }
        const resetUrl = linkData.properties.action_link;
        const { html, text, subject } = passwordResetEmail({
          resetUrl,
          firstName: target.firstName ?? target.fullName.split(" ")[0],
        });
        // Match the register flow: if delivery fails we still log+return so
        // the admin can copy the fallback link from the response rather than
        // silently assume the user got the email.
        const emailResult = await sendEmail({
          to: target.email,
          subject,
          html,
          text,
        });
        const emailDelivered =
          emailResult.ok && !("skipped" in emailResult && emailResult.skipped);
        await logAudit({
          actorId: me.id,
          action: "USER_PASSWORD_RESET",
          entityType: "User",
          entityId: id,
          metadata: {
            targetEmail: target.email,
            emailDelivered,
          },
          request: req,
        });
        return NextResponse.json({
          ok: true,
          emailDelivered,
          fallbackLink: emailDelivered ? null : resetUrl,
        });
      }
    }
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * DELETE /api/admin/users/[id]
 *
 * GDPR Art. 17 right-to-be-forgotten. Two-step workflow:
 *  1. Admin soft-deletes user via PATCH {action:"DISABLE"} — sets
 *     `deletedAt`, bans auth, revokes sessions.
 *  2. Admin calls this endpoint to *irreversibly* purge everything.
 *
 * We refuse to hard-delete a live user — enforcing the intermediate
 * disable step gives an audit paper trail and a 30-day grace window
 * implemented by the nightly retention cron. Bypassing that is
 * reserved for this endpoint, which also bypasses the grace period.
 *
 * Order of operations matters:
 *   1. Purge private bucket — once the DB cascade runs, the fileUrl
 *      list is gone and we'd orphan blobs in storage forever.
 *   2. Supabase auth.admin.deleteUser — cascades to sessions + tokens.
 *   3. Prisma user.delete — cascades to all relations marked Cascade.
 *      A Restrict hit (MedicalReport.uploadedBy) returns 409 with the
 *      FK error so the admin can reassign reports before retrying.
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const me = await requireRole(["ADMIN"]);
    const { id } = await params;

    const rl = await rateLimit({
      key: `admin-user-mutation:${me.id}`,
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Troppe modifiche, riprova più tardi" },
        {
          status: 429,
          headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
        },
      );
    }

    if (id === me.id) {
      return NextResponse.json(
        { error: "Non puoi eliminare te stesso" },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        deletedAt: true,
      },
    });
    if (!target) {
      return NextResponse.json(
        { error: "Utente non trovato" },
        { status: 404 },
      );
    }
    if (!target.deletedAt) {
      return NextResponse.json(
        {
          error:
            "Disabilita prima l'utente. L'eliminazione definitiva è a due passi.",
        },
        { status: 409 },
      );
    }

    // Step 1: storage purge (best-effort — if it fails we log but do not
    // abort, because leaving the DB half-deleted is strictly worse than
    // an orphan blob we can sweep later via the nightly cron).
    const storage = await purgeUserStorage(id);

    // Step 2: Supabase auth deletion. Cascades sessions + refresh tokens.
    const admin = createAdminClient();
    const { error: authErr } = await admin.auth.admin.deleteUser(id);
    if (authErr) {
      return NextResponse.json(
        { error: `Supabase deleteUser fallito: ${authErr.message}` },
        { status: 502 },
      );
    }

    // Step 3: Prisma cascade. On Restrict FK violation (e.g. pro with
    // MedicalReports uploaded) surface 409 rather than a generic 500
    // so the admin knows the action is actionable (reassign reports).
    try {
      await prisma.user.delete({ where: { id } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return NextResponse.json(
        {
          error:
            "Impossibile eliminare: questo utente ha caricato referti per altri pazienti. Riassegna o cancella quei referti prima di procedere.",
          detail: msg,
        },
        { status: 409 },
      );
    }

    await logAudit({
      actorId: me.id,
      action: "USER_HARD_DELETE",
      entityType: "User",
      entityId: id,
      metadata: {
        targetEmail: target.email,
        targetRole: target.role,
        targetFullName: target.fullName,
        storagePurged: storage.purged,
        storageError: storage.error,
      },
      request: req,
    });

    return NextResponse.json({ ok: true, storagePurged: storage.purged });
  } catch (e) {
    return errorResponse(e);
  }
}
