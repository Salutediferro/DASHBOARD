/**
 * Smoke test detector parole vietate Agente di Ferro.
 *
 * Esegui: `npx tsx src/features/agente-ferro/tests/detector.test.ts`
 *
 * Output: PASS/FAIL count + lista cases falliti.
 * Exit code 1 se almeno un test fallisce (CI-friendly).
 */

import { runDetectorTests } from "../lib";

const result = runDetectorTests();

console.log(`\n=== Detector Agente di Ferro · smoke test ===\n`);
console.log(`Total cases: ${result.total}`);
console.log(`Passed:      ${result.passed}`);
console.log(`Failed:      ${result.failed.length}\n`);

if (result.failed.length > 0) {
  console.log(`--- FAILED CASES ---`);
  for (const f of result.failed) {
    console.log(
      `  Input: "${f.input}"\n` +
        `    block: expected ${f.expectedBlock}, got ${f.gotBlock}\n` +
        `    category: expected ${f.expected}, got ${f.got}\n`
    );
  }
  process.exit(1);
}

console.log(`✓ All detector cases passed.\n`);
process.exit(0);
