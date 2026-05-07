import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { requireRole, errorResponse } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";

/**
 * GET /api/me/professionals
 *
 * Returns the list of professionals (doctor + coach) linked to the
 * current patient via an ACTIVE CareRelationship. Used by the patient
 * UI to populate the "grant access" dropdown in the permission manager.
 * Any other role gets an empty list.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (me.role !== "PATIENT") {
    return NextResponse.json([]);
  }

  const rels = await prisma.careRelationship.findMany({
    where: { patientId: me.id, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
    include: {
      professional: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          avatarUrl: true,
          bio: true,
          specialties: true,
        },
      },
    },
  });

  return NextResponse.json(
    rels.map((r) => ({
      relationshipId: r.id,
      professionalRole: r.professionalRole,
      professional: r.professional,
    })),
  );
}

const grantSchema = z.object({
  professionalId: z.string().uuid(),
});

/**
 * POST /api/me/professionals
 *
 * Patient re-activates (or creates a row for) a CareRelationship with a
 * professional they've previously had an appointment with. First-time
 * relationships are NOT created here — those are established as a side
 * effect of a patient booking (`POST /api/appointments`), so a stranger
 * cannot self-link to a professional and start messaging them. This
 * endpoint exists only to reactivate a paused/archived relationship for
 * a professional the patient has already engaged with.
 */
export async function POST(req: Request) {
  try {
    const me = await requireRole(["PATIENT"]);
    const body = await req.json().catch(() => null);
    const parsed = grantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "professionalId richiesto" },
        { status: 400 },
      );
    }
    const { professionalId } = parsed.data;
    if (professionalId === me.id) {
      return NextResponse.json(
        { error: "Non puoi collegarti a te stesso." },
        { status: 400 },
      );
    }

    const [patient, target] = await Promise.all([
      prisma.user.findUnique({
        where: { id: me.id },
        select: { id: true, organizationId: true },
      }),
      prisma.user.findUnique({
        where: { id: professionalId },
        select: {
          id: true,
          role: true,
          deletedAt: true,
          organizationId: true,
        },
      }),
    ]);
    if (!patient || !target) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (target.deletedAt) {
      return NextResponse.json(
        { error: "Account non disponibile." },
        { status: 410 },
      );
    }
    if (target.role !== "DOCTOR") {
      return NextResponse.json(
        { error: "L'utente selezionato non è un professionista." },
        { status: 400 },
      );
    }
    if (target.organizationId !== patient.organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Gate: the patient must have already had at least one appointment
    // with this professional. Strangers do not get to self-link — they
    // must go through the booking flow, which establishes the
    // relationship as a transactional side effect.
    const priorAppointment = await prisma.appointment.findFirst({
      where: { professionalId: target.id, patientId: me.id },
      select: { id: true },
    });
    if (!priorAppointment) {
      return NextResponse.json(
        {
          error:
            "Per aggiungere un professionista al team, prenota prima un appuntamento.",
        },
        { status: 403 },
      );
    }

    const existing = await prisma.careRelationship.findUnique({
      where: {
        professionalId_patientId_professionalRole: {
          professionalId: target.id,
          patientId: me.id,
          professionalRole: "DOCTOR",
        },
      },
      select: { id: true, status: true },
    });

    const rel = existing
      ? await prisma.careRelationship.update({
          where: { id: existing.id },
          data: {
            status: "ACTIVE",
            startDate: new Date(),
            endDate: null,
          },
          include: {
            professional: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                avatarUrl: true,
                bio: true,
                specialties: true,
              },
            },
          },
        })
      : await prisma.careRelationship.create({
          data: {
            professionalId: target.id,
            patientId: me.id,
            professionalRole: "DOCTOR",
            status: "ACTIVE",
          },
          include: {
            professional: {
              select: {
                id: true,
                fullName: true,
                email: true,
                role: true,
                avatarUrl: true,
                bio: true,
                specialties: true,
              },
            },
          },
        });

    await logAudit({
      actorId: me.id,
      action: "CARE_RELATIONSHIP_GRANT",
      entityType: "CareRelationship",
      entityId: rel.id,
      metadata: { professionalId: target.id, reactivated: !!existing },
      request: req,
    });

    return NextResponse.json(
      {
        relationshipId: rel.id,
        professionalRole: rel.professionalRole,
        professional: rel.professional,
      },
      { status: existing ? 200 : 201 },
    );
  } catch (e) {
    return errorResponse(e);
  }
}
