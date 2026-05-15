import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { resolveCaller } from "@/lib/appointments/access";
import { disconnectGoogle } from "@/lib/google/oauth";

/**
 * DELETE /api/google/disconnect
 *
 * Removes the GoogleAccount row for the calling user and best-effort
 * revokes the refresh token at Google. After this, no future
 * appointment acceptance will create a Meet link for this pro — they'd
 * have to /api/google/oauth/start again to reconnect.
 *
 * Past Appointment.googleEventId values are left alone: the events
 * still exist in Google Calendar and the patient already got the email.
 * Reschedules/cancels for those appointments will become no-ops on the
 * Google side (see updateMeetEvent / cancelMeetEvent — they short-
 * circuit when no client is available).
 */
export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const me = await resolveCaller(user.id);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectGoogle(me.id);
  return NextResponse.json({ ok: true });
}
