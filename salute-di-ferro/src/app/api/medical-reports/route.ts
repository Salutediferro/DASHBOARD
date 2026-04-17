import { NextResponse } from "next/server";
import type { MedicalReportCategory, Prisma } from "@prisma/client";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, MEDICAL_REPORTS_BUCKET } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";
import {
  createMedicalReportSchema,
  MEDICAL_REPORT_CATEGORIES,
} from "@/lib/validators/medical-report";
import {
  auditMedicalReportAccess,
  resolveCaller,
} from "@/lib/medical-records/access";
import { rateLimit, requestKey } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/heic",
]);

/**
 * GET /api/medical-reports
 *
 * - PATIENT: own reports
 * - DOCTOR/COACH: require ACTIVE CareRelationship with ?patientId AND an
 *   unrevoked ReportPermission on each report (double check). The list
 *   query already filters to reports where a valid permission exists.
 * - ADMIN: unrestricted (optional patientId filter)
 *
 * Optional filters: ?category=, ?from=, ?to=
 */
export async function GET(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const patientIdParam = searchParams.get("patientId");
  const category = searchParams.get("category");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const where: Prisma.MedicalReportWhereInput = {};

  if (me.role === "PATIENT") {
    where.patientId = me.id;
  } else if (me.role === "DOCTOR" || me.role === "COACH") {
    if (!patientIdParam) {
      return NextResponse.json(
        { error: "patientId required" },
        { status: 400 },
      );
    }
    const rel = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: patientIdParam,
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!rel) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    where.patientId = patientIdParam;
    where.permissions = {
      some: {
        granteeId: me.id,
        revokedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
    };
  } else if (me.role === "ADMIN") {
    if (patientIdParam) where.patientId = patientIdParam;
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (
    category &&
    MEDICAL_REPORT_CATEGORIES.includes(category as MedicalReportCategory)
  ) {
    where.category = category as MedicalReportCategory;
  }
  if (from || to) {
    const range: Prisma.DateTimeFilter = {};
    if (from) range.gte = new Date(from);
    if (to) range.lte = new Date(to);
    where.uploadedAt = range;
  }

  const rows = await prisma.medicalReport.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
    include: {
      uploadedBy: {
        select: { id: true, fullName: true, role: true },
      },
      _count: { select: { permissions: true } },
    },
  });

  await auditMedicalReportAccess({
    actorId: me.id,
    actorRole: me.role,
    reportId: "LIST",
    patientId: (where.patientId as string) ?? "*",
    action: "LIST",
    extra: { count: rows.length },
    request: req,
  });

  // Strip internal storage path from the response; callers use GET /[id]
  // to obtain a signed URL when they want to read the actual file.
  const items = rows.map((r) => ({
    id: r.id,
    patientId: r.patientId,
    uploadedById: r.uploadedById,
    uploadedBy: r.uploadedBy,
    fileName: r.fileName,
    mimeType: r.mimeType,
    fileSize: r.fileSize,
    category: r.category,
    title: r.title,
    notes: r.notes,
    issuedAt: r.issuedAt ? r.issuedAt.toISOString().slice(0, 10) : null,
    uploadedAt: r.uploadedAt.toISOString(),
    permissionCount: r._count.permissions,
  }));

  return NextResponse.json(items);
}

/**
 * POST /api/medical-reports  (multipart form)
 *
 * Uploaders:
 *   - PATIENT: uploads to their own record. The `patientId` field in the
 *     JSON meta is ignored if set.
 *   - DOCTOR: may upload on behalf of a patient by passing `patientId`
 *     in the meta — must have an ACTIVE CareRelationship as DOCTOR.
 *     A grant is automatically created so the doctor retains access
 *     through the normal ReportPermission flow.
 *   - COACH / ADMIN: not allowed to upload.
 */
export async function POST(req: Request) {
  // Rate limit: 20 uploads per IP per 10 minutes — generous enough for
  // legitimate bulk uploads, tight enough to block abuse.
  const rl = await rateLimit({
    key: requestKey(req, "medical-report-upload"),
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Troppi upload, riprova più tardi" },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil(rl.resetIn / 1000)) },
      },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const me = await resolveCaller(user.id);
  if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (me.role !== "PATIENT" && me.role !== "DOCTOR") {
    return NextResponse.json(
      { error: "Solo paziente o medico possono caricare referti" },
      { status: 403 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file mancante" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File troppo grande (max 20MB)" },
      { status: 400 },
    );
  }
  if (!ALLOWED_MIME.has(file.type)) {
    return NextResponse.json(
      { error: "Formato non supportato (PDF, PNG, JPEG, WEBP, HEIC)" },
      { status: 400 },
    );
  }

  const metaRaw = {
    title: form.get("title") ?? file.name,
    category: form.get("category") ?? "OTHER",
    notes: form.get("notes") ?? null,
    issuedAt: form.get("issuedAt") ?? null,
    patientId: form.get("patientId") ?? null,
  };
  const parsed = createMedicalReportSchema.safeParse(metaRaw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  // Resolve target patient.
  let targetPatientId: string;
  if (me.role === "PATIENT") {
    targetPatientId = me.id;
  } else {
    // DOCTOR
    if (!parsed.data.patientId) {
      return NextResponse.json(
        { error: "patientId richiesto per l'upload a nome del paziente" },
        { status: 400 },
      );
    }
    const rel = await prisma.careRelationship.findFirst({
      where: {
        professionalId: me.id,
        patientId: parsed.data.patientId,
        professionalRole: "DOCTOR",
        status: "ACTIVE",
      },
      select: { id: true },
    });
    if (!rel) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    targetPatientId = parsed.data.patientId;
  }

  // Upload to the private bucket. NOTE: the bucket must already exist
  // (set up manually in Supabase Dashboard or on the first deploy); this
  // route does not auto-create it. See prisma/SEED.md for setup.
  const admin = createAdminClient();
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "bin";
  const storagePath = `${targetPatientId}/${crypto.randomUUID()}.${ext}`;

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

  try {
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.medicalReport.create({
        data: {
          patientId: targetPatientId,
          uploadedById: me.id,
          fileUrl: storagePath,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          title: parsed.data.title,
          category: parsed.data.category,
          notes: parsed.data.notes ?? null,
          issuedAt: parsed.data.issuedAt
            ? new Date(parsed.data.issuedAt)
            : null,
        },
      });

      // Doctor upload → auto-grant the doctor access to their own upload.
      if (me.role === "DOCTOR") {
        await tx.reportPermission.create({
          data: { reportId: created.id, granteeId: me.id },
        });
      }

      return created;
    });

    await auditMedicalReportAccess({
      actorId: me.id,
      actorRole: me.role,
      reportId: row.id,
      patientId: targetPatientId,
      action: "UPLOAD",
      extra: { fileName: row.fileName, fileSize: row.fileSize },
      request: req,
    });

    return NextResponse.json(
      {
        id: row.id,
        patientId: row.patientId,
        fileName: row.fileName,
        mimeType: row.mimeType,
        fileSize: row.fileSize,
        category: row.category,
        title: row.title,
        notes: row.notes,
        issuedAt: row.issuedAt ? row.issuedAt.toISOString().slice(0, 10) : null,
        uploadedAt: row.uploadedAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    // Roll back the uploaded file if the DB write fails so we don't
    // leave orphaned objects in the bucket.
    await admin.storage
      .from(MEDICAL_REPORTS_BUCKET)
      .remove([storagePath])
      .catch(() => undefined);
    const message = e instanceof Error ? e.message : "DB insert failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
