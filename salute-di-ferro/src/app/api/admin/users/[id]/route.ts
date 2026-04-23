import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { passwordResetEmail } from "@/lib/email/templates";

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
