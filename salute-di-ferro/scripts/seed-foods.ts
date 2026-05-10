/**
 * Seed the `Food` table from a JSON-Lines fixture (one food per line).
 *
 * The default fixture is `prisma/data/foods.jsonl` — the Italian
 * CREA/INRAN food composition tables exported once and committed to the
 * repo. Re-running upserts by `foodCode`, so this script is safe to
 * re-run when the dataset is refreshed (no manual TRUNCATE needed).
 *
 * Usage
 *   npm run db:seed:foods                     # default fixture
 *   tsx scripts/seed-foods.ts ./other.jsonl   # custom path
 *
 * Why JSONL instead of JSON: the source export is line-delimited, and
 * line streaming lets us hold one record in memory at a time instead of
 * parsing a 15MB array up front. With 900 rows it does not matter today,
 * but the same code keeps working if the dataset grows.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import * as path from "node:path";

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ── Connection ───────────────────────────────────────────────────────────────
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL / DIRECT_URL is not set");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

// ── Source-file shape ────────────────────────────────────────────────────────
// Mirrors the CREA/INRAN export. We only consume the fields below; the
// export carries plenty more (vitamins, minerals, amino acids, langual
// codes...) that we ignore to keep the table narrow.
type RawMacro = { description: string; value: string | number | null };

type RawFood = {
  name: string;
  category: string;
  food_code: string;
  scientific_name?: string | null;
  english_name?: string | null;
  portion?: number | null;
  edible_part?: number | null;
  image?: string | null;
  macro_nutrients?: RawMacro[];
};

// Map source `description` → our column name. Only columns we care
// about; everything else in `macro_nutrients` is dropped.
const MACRO_KEY_MAP: Record<string, "kcal" | "protein" | "carbs" | "fat" | "fiber"> = {
  energy_kcal: "kcal",
  proteins: "protein",
  available_carbohydrates: "carbs",
  lipids: "fat",
  total_fiber: "fiber",
};

function parseNumber(v: string | number | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickMacros(macros: RawMacro[] | undefined) {
  const out: Partial<Record<"kcal" | "protein" | "carbs" | "fat" | "fiber", number>> = {};
  if (!macros) return out;
  for (const m of macros) {
    const key = MACRO_KEY_MAP[m.description];
    if (!key) continue;
    const n = parseNumber(m.value);
    if (n != null) out[key] = n;
  }
  return out;
}

// ── Seed ─────────────────────────────────────────────────────────────────────
async function main() {
  const fixturePath = path.resolve(
    process.argv[2] ?? path.join(process.cwd(), "prisma/data/foods.jsonl"),
  );

  console.log(`▶ Seeding foods from ${fixturePath}`);

  const stream = createReadStream(fixturePath, { encoding: "utf8" });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });

  let processed = 0;
  let upserted = 0;
  let skipped = 0;

  // Upsert rows one at a time. With ~900 rows over a regional Postgres
  // this finishes in a few seconds; if the dataset grows past ~10k it'd
  // be worth batching with `createMany({ skipDuplicates: true })` after
  // a wipe, but the upsert path keeps re-runs safe today.
  for await (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    processed++;

    let row: RawFood;
    try {
      row = JSON.parse(line) as RawFood;
    } catch (err) {
      console.warn(`  ✖ line ${processed}: JSON parse failed — skipping`, err);
      skipped++;
      continue;
    }

    if (!row.food_code || !row.name) {
      skipped++;
      continue;
    }

    const macros = pickMacros(row.macro_nutrients);
    if (macros.kcal == null) {
      // Without kcal the picker can't rescale — refuse the row instead
      // of writing a `0` placeholder that would then mislead patients.
      skipped++;
      continue;
    }

    const portion = parseNumber(row.portion);
    const edible = parseNumber(row.edible_part);

    const data = {
      foodCode: row.food_code,
      name: row.name,
      englishName: row.english_name?.trim() || null,
      scientificName: row.scientific_name?.trim() || null,
      category: row.category,
      portionG: portion != null && portion > 0 ? Math.round(portion) : 100,
      ediblePart: edible != null ? edible : 1,
      kcalPer100g: Math.round(macros.kcal),
      proteinPer100g: macros.protein ?? null,
      carbsPer100g: macros.carbs ?? null,
      fatPer100g: macros.fat ?? null,
      fiberPer100g: macros.fiber ?? null,
      imageUrl: row.image?.trim() || null,
    };

    await prisma.food.upsert({
      where: { foodCode: data.foodCode },
      create: data,
      update: data,
    });
    upserted++;

    if (upserted % 100 === 0) {
      console.log(`  · ${upserted} upserted`);
    }
  }

  console.log(
    `✔ Done — processed ${processed}, upserted ${upserted}, skipped ${skipped}`,
  );
}

main()
  .catch((err) => {
    console.error("✖ Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
