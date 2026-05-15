import { google } from "googleapis";
import { randomUUID } from "node:crypto";

import { getOAuthClientForUser } from "@/lib/google/oauth";

/**
 * Google Calendar helpers.
 *
 * Scope: only what the appointment-acceptance flow needs — create on
 * accept, patch on reschedule, delete on cancel. Always writes to the
 * professional's "primary" calendar so the event shows up in the same
 * UI they're used to opening.
 *
 * Meet links: we pass `conferenceDataVersion: 1` and a
 * conferenceData.createRequest with a fresh requestId. Google mints the
 * Meet link server-side; we read it back from `data.hangoutLink`.
 *
 * All helpers return `null` (or skip silently) when the user hasn't
 * linked Google. The caller already decided that acceptance should
 * succeed regardless — the in-app notification + email cover that case.
 */

export type CreateMeetEventArgs = {
  /** The professional accepting the request. We use *their* Google
   *  account; the event lives on their primary calendar. */
  professionalUserId: string;
  appointmentId: string;
  startTime: Date;
  endTime: Date;
  summary: string;
  description: string;
  /** Added as a guest so the event lands in their Google Calendar too,
   *  if they happen to use Google. Optional. */
  patientEmail?: string | null;
  patientName?: string | null;
};

export type CreateMeetEventResult = {
  eventId: string;
  hangoutLink: string | null;
  htmlLink: string | null;
};

/** Create a Calendar event with a Meet link on the pro's primary
 *  calendar. Returns null when the pro hasn't linked Google. Throws on
 *  Google API errors — caller decides whether to surface or swallow. */
export async function createMeetEvent(
  args: CreateMeetEventArgs,
): Promise<CreateMeetEventResult | null> {
  const auth = await getOAuthClientForUser(args.professionalUserId);
  if (!auth) return null;

  const calendar = google.calendar({ version: "v3", auth: auth.client });

  const requestId = randomUUID();

  const res = await calendar.events.insert({
    calendarId: "primary",
    conferenceDataVersion: 1,
    // No `sendUpdates: "all"` — we send our own email via Resend so the
    // patient inbox doesn't get a duplicate "you're invited" from
    // Google. Switching this on would also expose the pro's Google
    // email in the From header, which we'd rather not do.
    sendUpdates: "none",
    requestBody: {
      summary: args.summary,
      description: args.description,
      start: { dateTime: args.startTime.toISOString() },
      end: { dateTime: args.endTime.toISOString() },
      attendees: args.patientEmail
        ? [
            {
              email: args.patientEmail,
              displayName: args.patientName ?? undefined,
              responseStatus: "needsAction",
            },
          ]
        : undefined,
      conferenceData: {
        createRequest: {
          requestId,
          conferenceSolutionKey: { type: "hangoutsMeet" },
        },
      },
      // Stash the SdF id so a human staring at the event can correlate
      // it back to a row in our DB.
      extendedProperties: {
        private: { sdfAppointmentId: args.appointmentId },
      },
    },
  });

  if (!res.data.id) {
    throw new Error("Google Calendar did not return an event id.");
  }
  return {
    eventId: res.data.id,
    hangoutLink: res.data.hangoutLink ?? null,
    htmlLink: res.data.htmlLink ?? null,
  };
}

export type UpdateMeetEventArgs = {
  professionalUserId: string;
  eventId: string;
  startTime?: Date;
  endTime?: Date;
  summary?: string;
  description?: string;
};

/** Patch start/end/notes on the previously-created Google event. No-op
 *  when the pro has disconnected Google in the meantime. Swallows
 *  "event not found" because the pro may have deleted it directly in
 *  Google Calendar — not worth blocking a reschedule over. */
export async function updateMeetEvent(
  args: UpdateMeetEventArgs,
): Promise<void> {
  const auth = await getOAuthClientForUser(args.professionalUserId);
  if (!auth) return;

  const calendar = google.calendar({ version: "v3", auth: auth.client });
  const body: Record<string, unknown> = {};
  if (args.startTime) body.start = { dateTime: args.startTime.toISOString() };
  if (args.endTime) body.end = { dateTime: args.endTime.toISOString() };
  if (args.summary !== undefined) body.summary = args.summary;
  if (args.description !== undefined) body.description = args.description;
  if (Object.keys(body).length === 0) return;

  try {
    await calendar.events.patch({
      calendarId: "primary",
      eventId: args.eventId,
      sendUpdates: "none",
      requestBody: body,
    });
  } catch (e: unknown) {
    if (isNotFound(e)) return;
    throw e;
  }
}

/** Delete the Google event mirroring this appointment. No-op when the
 *  pro disconnected Google or already deleted the event manually. */
export async function cancelMeetEvent(args: {
  professionalUserId: string;
  eventId: string;
}): Promise<void> {
  const auth = await getOAuthClientForUser(args.professionalUserId);
  if (!auth) return;

  const calendar = google.calendar({ version: "v3", auth: auth.client });
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: args.eventId,
      sendUpdates: "none",
    });
  } catch (e: unknown) {
    if (isNotFound(e) || isGone(e)) return;
    throw e;
  }
}

function isNotFound(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === 404;
}
function isGone(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === 410;
}
