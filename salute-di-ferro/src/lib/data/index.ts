/**
 * Data layer entry point — switches between Prisma fetchers and mock
 * scenarios based on env. Consumers always import from
 * `@/lib/data` and never reach into `real` / `mock` directly so the
 * dependency direction stays one-way and tree-shaking is clean.
 *
 *   MOCK_AGENTE=true            → mock (server-side flag)
 *   NEXT_PUBLIC_DEV_BYPASS=1    → mock (covers local dev where the
 *                                 middleware impersonates a user)
 */

import * as real from "./real";
import * as mock from "./mock";

const useMock =
  process.env.MOCK_AGENTE === "true" ||
  process.env.NEXT_PUBLIC_DEV_BYPASS === "1";

export const dataSource = useMock ? mock : real;

export * from "./types";
