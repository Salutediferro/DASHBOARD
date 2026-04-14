import { NextResponse } from "next/server";
import type { MedicalReportCategory } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, MEDICAL_REPORTS_BUCKET } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import { createMedicalReportSchema } from "@/lib/validators/medical-report";

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
]);
const SIGNED_URL_TTL = 60 * 10; // 10 min

type ReportRow = {
  id: string;
  patientId: string;
  uploadedById: string;
  fileUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: number | null;
  category: MedicalReportCategory;
  title: string;
  notes: string | null;
  issuedAt: Date | null;
  uploadedAt: Date;
};

async function signReports(rows: ReportRow[]) {
  const admin = createAdminClient();
  const out = await Promise.all(
    rows.map(async (r) => {
      const { data } = await admin.storage
        .from(MEDICAL_REPORTS_BUCKET)
        .createSignedUrl(r.fileUrl, SIGNED_URL_TTL);
      return {
        id: r.id,
        patientId: r.patientId,
        fileName: r.fileName,
        mimeType: r.mimeType,
        fileSize: r.fileSize,
        category: r.category,
        title: r.title,
        notes: r.notes,
        issuedAt: r.issuedAt ? r.issuedAt.toISOString().slice(0, 10) : null,
        uploadedAt: r.uploadedAt.toISOString(),
        signedUrl: data?.signedUrl ?? null,
      };
    }),
  );
  return out;
}

export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const patientIdParam = searchParams.get("patientId");

  let rows: ReportRow[] = [];
  if (me.role === "PATIENT") {
    // Patient sees their own reports.
    rows = (await prisma.medicalReport.findMany({
      where: { patientId: user.id },
      orderBy: { uploadedAt: "desc" },
    })) as ReportRow[];
  } else if (me.role === "DOCTOR" || me.role === "COACH") {
    // Professional sees only reports where a non-revoked permission grants them access.
    if (!patientIdParam) {
      return NextResponse.json({ error: "patientId required" }, { status: 400 });
    }
    rows = (await prisma.medicalReport.findMany({
      where: {
        patientId: patientIdParam,
        permissions: {
          some: { granteeId: user.id, revokedAt: null },
        },
      },
      orderBy: { uploadedAt: "desc" },
    })) as ReportRow[];
  } else {
    // Admin: unrestricted.
    rows = (await prisma.medicalReport.findMany({
      where: patientIdParam ? { patientId: patientIdParam } : {},
      orderBy: { uploadedAt: "desc" },
    })) as ReportRow[];
  }

  return NextResponse.json(await signReports(rows));
}

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
    return NextResponse.json({ error: "File troppo grande (max 15MB)" }, { status: 400 });
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Formato non supportato (PDF o immagini)" },
      { status: 400 },
    );
  }

  const metaRaw = {
    title: form.get("title") ?? file.name,
    category: form.get("category") ?? "OTHER",
    notes: form.get("notes") ?? null,
    issuedAt: form.get("issuedAt") ?? null,
  };
  const parsed = createMedicalReportSchema.safeParse(metaRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const storagePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const admin = createAdminClient();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const { error: upErr } = await admin.storage
    .from(MEDICAL_REPORTS_BUCKET)
    .upload(storagePath, bytes, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json(
      { error: `Upload fallito: ${upErr.message}` },
      { status: 500 },
    );
  }

  const row = await prisma.medicalReport.create({
    data: {
      patientId: user.id,
      uploadedById: user.id,
      fileUrl: storagePath,
      fileName: file.name,
      mimeType: file.type,
      fileSize: file.size,
      title: parsed.data.title,
      category: parsed.data.category,
      notes: parsed.data.notes ?? null,
      issuedAt: parsed.data.issuedAt ? new Date(parsed.data.issuedAt) : null,
    },
  });

  const [signed] = await signReports([row as ReportRow]);
  return NextResponse.json(signed, { status: 201 });
}
