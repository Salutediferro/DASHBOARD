import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { resolveCaller } from "@/lib/appointments/access";

type Ctx = { params: Promise<{ id: string }> };

/**
 * DELETE /api/availability/[id]
 * Only the owner professional (or admin) may remove one of their own
 * AvailabilitySlot rows.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const slot = await prisma.availabilitySlot.findUnique({ where: { id } });
  if (!slot) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (slot.professionalId !== me.id && me.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.availabilitySlot.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
