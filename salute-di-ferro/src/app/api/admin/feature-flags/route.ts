import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FEATURE_FLAGS,
  setFeatureFlag,
  snapshotFeatureFlags,
  type FeatureFlagKey,
} from "@/lib/feature-flags";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const VALID_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];

const patchSchema = z.object({
  key: z.enum(VALID_KEYS as [FeatureFlagKey, ...FeatureFlagKey[]]),
  value: z.boolean(),
});

export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const items = await snapshotFeatureFlags();
    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const me = await requireRole(["ADMIN"]);

    const rl = await rateLimit({
      key: `admin-flag-change:${me.id}`,
      limit: 30,
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

    const before = await snapshotFeatureFlags();
    const previous = before.find((s) => s.key === parsed.data.key);

    const result = await setFeatureFlag(parsed.data.key, parsed.data.value);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Scrittura fallita" },
        { status: 502 },
      );
    }

    await logAudit({
      actorId: me.id,
      action: "FEATURE_FLAG_CHANGE",
      entityType: "FeatureFlag",
      entityId: parsed.data.key,
      metadata: {
        key: parsed.data.key,
        from: previous ? previous.value : null,
        to: parsed.data.value,
        previousSource: previous?.source ?? null,
      },
      request: req,
    });

    const items = await snapshotFeatureFlags();
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorResponse(e);
  }
}
