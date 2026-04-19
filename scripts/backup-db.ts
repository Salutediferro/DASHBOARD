/**
 * Manual DB backup via pg_dump.
 *
 * Supabase provides daily automatic backups on the free tier (7-day
 * retention) and point-in-time recovery on Pro. This script is an
 * independent, owner-controlled belt-and-suspenders: it dumps the full
 * schema+data to a timestamped file on local disk, so a prod-level
 * incident (accidental table drop, Supabase outage, data corruption
 * discovered late) is recoverable even if the managed backups aren't.
 *
 * Usage
 *   npm run db:backup                 # → backups/sdf-YYYYMMDD-HHMMSS.dump
 *   npm run db:backup ./path.dump     # → custom output path
 *
 * Requirements
 *   - pg_dump 17+ on PATH (matches Supabase's Postgres 17).
 *   - DIRECT_URL env var (direct session pooler — transaction pooler
 *     rejects pg_dump).
 *
 * Restore
 *   pg_restore --clean --if-exists --no-owner --no-privileges \
 *     -d $RESTORE_TARGET_URL backups/sdf-YYYYMMDD-HHMMSS.dump
 *   (Point RESTORE_TARGET_URL at a staging DB first — never restore
 *    blindly onto production.)
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv();

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, stat } from "node:fs/promises";
import * as path from "node:path";

const execFileAsync = promisify(execFile);

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-` +
    `${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

async function main() {
  const url = process.env.DIRECT_URL;
  if (!url) {
    console.error("DIRECT_URL is not set (use the session pooler, not :6543).");
    process.exit(1);
  }

  const outArg = process.argv[2];
  const out =
    outArg ?? path.join(process.cwd(), "backups", `sdf-${stamp()}.dump`);
  await mkdir(path.dirname(out), { recursive: true });

  console.log(`Dumping → ${out}`);
  try {
    await execFileAsync(
      "pg_dump",
      [
        "--format=custom",
        "--no-owner",
        "--no-privileges",
        "--clean",
        "--if-exists",
        "--file",
        out,
        url,
      ],
      { maxBuffer: 1024 * 1024 * 1024 }, // 1 GiB
    );
    const { size } = await stat(out);
    console.log(`Done. ${Math.round((size / 1024) * 10) / 10} KiB`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Dump failed:", msg);
    if (msg.includes("pg_dump: not found") || msg.includes("ENOENT")) {
      console.error(
        "Install Postgres client 17 (`brew install postgresql@17`) and retry.",
      );
    }
    process.exit(1);
  }
}

main();
