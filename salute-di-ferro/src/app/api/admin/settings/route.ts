import { NextResponse } from "next/server";
import { z } from "zod";
import {
  PLATFORM_SETTINGS,
  setPlatformBool,
  snapshotPlatformSettings,
  type PlatformSettingKey,
} from "@/lib/platform-settings";
import { errorResponse, requireRole } from "@/lib/auth/require-role";
import { logAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

const VALID_KEYS = Object.keys(PLATFORM_SETTINGS) as PlatformSettingKey[];

const patchSchema = z.object({
  key: z.enum(VALID_KEYS as [PlatformSettingKey, ...PlatformSettingKey[]]),
  value: z.boolean(),
});

/**
 * GET /api/admin/settings
 *
 * Snapshot of every platform-wide runtime setting with its effective
 * value and the source the value came from (redis / env / default) so
 * the admin UI can explain why a flag is ON/OFF.
 */
export async function GET() {
  try {
    await requireRole(["ADMIN"]);
    const items = await snapshotPlatformSettings();
    return NextResponse.json({ items });
  } catch (e) {
    return errorResponse(e);
  }
}

/**
 * PATCH /api/admin/settings
 *
 * Toggle a single setting. Body: `{ key, value }`. Writes to Redis;
 * env-var defaults continue to apply when Redis is unreachable. Each
 * change is rate-limited and recorded as `PLATFORM_SETTING_CHANGE` with
 * the before/after in metadata.
 */
export async function PATCH(req: Request) {
  try {
    const me = await requireRole(["ADMIN"]);

    const rl = await rateLimit({
      key: `admin-setting-change:${me.id}`,
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

    // Snapshot BEFORE the write so the audit captures the transition —
    // with just the new value you can't reconstruct what flipped.
    const before = await snapshotPlatformSettings();
    const previous = before.find((s) => s.key === parsed.data.key);

    const result = await setPlatformBool(parsed.data.key, parsed.data.value);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "Scrittura fallita" },
        { status: 502 },
      );
    }

    await logAudit({
      actorId: me.id,
      action: "PLATFORM_SETTING_CHANGE",
      entityType: "PlatformSetting",
      entityId: parsed.data.key,
      metadata: {
        key: parsed.data.key,
        from: previous ? previous.value : null,
        to: parsed.data.value,
        previousSource: previous?.source ?? null,
      },
      request: req,
    });

    const items = await snapshotPlatformSettings();
    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return errorResponse(e);
  }
}
