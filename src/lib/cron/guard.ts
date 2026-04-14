import { NextResponse } from "next/server";

/**
 * Cron endpoints accept either:
 *  - Vercel Cron: `authorization: Bearer ${CRON_SECRET}`
 *  - Dev bypass: `x-dev-bypass: 1` in development
 */
export function authorizeCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  const devBypass =
    process.env.NODE_ENV === "development" &&
    req.headers.get("x-dev-bypass") === "1";

  if (devBypass) return null;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}

/**
 * Returns the current hour (0-23) in the Europe/Rome timezone.
 * Used to guard UTC cron schedules so a job fires at 09:00 Italian time year-round.
 */
export function currentRomeHour(): number {
  const s = new Intl.DateTimeFormat("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    hour12: false,
  }).format(new Date());
  return Number.parseInt(s, 10);
}
