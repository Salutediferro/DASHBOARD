import { NextResponse } from "next/server";
import { z } from "zod";
import { rateLimit, requestKey } from "@/lib/rate-limit";
import {
  STAFF_GATE_COOKIE,
  STAFF_GATE_TTL_SECONDS,
  checkPassword,
  issueGateToken,
} from "@/lib/staff-provision/token";

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export async function POST(req: Request) {
  const rl = await rateLimit({
    key: requestKey(req, "staff-gate"),
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Troppi tentativi, riprova più tardi" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
      },
    );
  }

  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!checkPassword(parsed.data.password)) {
    return NextResponse.json({ error: "Password errata" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: STAFF_GATE_COOKIE,
    value: issueGateToken(),
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: STAFF_GATE_TTL_SECONDS,
  });
  return res;
}
