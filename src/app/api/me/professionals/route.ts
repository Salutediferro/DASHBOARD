import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
