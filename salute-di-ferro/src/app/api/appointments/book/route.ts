import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAppointment } from "@/lib/mock-appointments";
import { bookSchema } from "@/lib/validators/appointment";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = bookSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }
  const { startTime, type, durationMin, notes, coachId } = parsed.data;
  const start = new Date(startTime);
  const end = new Date(start.getTime() + durationMin * 60000);

  const apt = createAppointment({
    coachId,
    clientId: user.id,
    clientName:
      (user.user_metadata?.fullName as string | undefined) ??
      user.email ??
      "Cliente",
    startTime: start.toISOString(),
    endTime: end.toISOString(),
    type,
    notes: notes ?? null,
    meetingUrl: type === "VIDEO_CALL" ? "https://meet.example.com/demo" : null,
  });
  return NextResponse.json(apt, { status: 201 });
}
