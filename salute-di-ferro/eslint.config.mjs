import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    rules: {
      // `react-hooks/set-state-in-effect` (eslint-plugin-react-hooks v7,
      // pulled in by eslint-config-next) flags `setState` inside any
      // `useEffect`. The codebase has ~30 legitimate uses of that
      // pattern — dialog state reset on open, localStorage hydration
      // after mount, deriving form fields from a freshly-loaded entry,
      // time-of-day greeting, etc. — so failing CI on every one is
      // disproportionate. Keep it as a warning so devs still see the
      // nudge during local lint and we can refactor case-by-case
      // without blocking deploys.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
