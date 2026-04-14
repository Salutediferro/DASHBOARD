import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

const AVATARS_BUCKET = "avatars";
const MAX_FILE_SIZE = 3 * 1024 * 1024; // 3 MB
const ALLOWED_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
]);

/**
 * POST /api/me/avatar
 * Multipart body with a single `file` field. Stores the image in the public
 * "avatars" bucket under `{userId}/avatar-{ts}.{ext}`, updates the user's
 * avatarUrl in Prisma, returns the new public URL.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file mancante" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "Immagine troppo grande (max 3MB)" },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Formato non supportato (PNG, JPEG, WEBP, HEIC)" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Ensure the bucket exists (idempotent, public read for avatar URLs).
  const { data: existing } = await admin.storage.getBucket(AVATARS_BUCKET);
  if (!existing) {
    const { error: bucketErr } = await admin.storage.createBucket(AVATARS_BUCKET, {
      public: true,
      fileSizeLimit: MAX_FILE_SIZE,
      allowedMimeTypes: Array.from(ALLOWED_MIME),
    });
    if (bucketErr && !bucketErr.message.includes("already exists")) {
      return NextResponse.json(
        { error: `Bucket setup failed: ${bucketErr.message}` },
        { status: 500 },
      );
    }
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const storagePath = `${user.id}/avatar-${Date.now()}.${ext}`;

  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(AVATARS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: true,
    });
  if (upErr) {
    return NextResponse.json(
      { error: `Upload fallito: ${upErr.message}` },
      { status: 500 },
    );
  }

  const { data: publicUrl } = admin.storage
    .from(AVATARS_BUCKET)
    .getPublicUrl(storagePath);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: publicUrl.publicUrl },
    select: { avatarUrl: true },
  });

  return NextResponse.json({ avatarUrl: updated.avatarUrl });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });
  return NextResponse.json({ avatarUrl: null });
}
