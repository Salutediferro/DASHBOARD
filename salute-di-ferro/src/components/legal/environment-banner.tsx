/**
 * Visible "this is NOT production" banner for preview / staging deploys.
 *
 * Read from NEXT_PUBLIC_VERCEL_ENV (auto-populated by Vercel on every
 * deploy). Production returns null — the banner is a no-op there and
 * the component adds zero runtime cost. Preview and branch deployments
 * get a top-of-page bar so nobody accidentally inputs real patient
 * data into a staging env.
 *
 * Rendered server-side for the env signal to land in the initial HTML.
 * No client JS required.
 */

export function EnvironmentBanner() {
  const env = process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (!env || env === "production") return null;

  const label =
    env === "preview" ? "STAGING / PREVIEW" : env.toUpperCase();

  return (
    <div
      role="status"
      aria-live="polite"
      // Safe-area-top so on iPhone with notch the text doesn't vanish
      // under the Dynamic Island. Applies only on preview/staging so
      // production sees zero impact.
      className="sticky top-0 z-50 w-full bg-amber-500 pt-[env(safe-area-inset-top)] text-center text-xs font-semibold text-black"
      style={{ paddingBlock: "4px" }}
    >
      {label} — i dati qui dentro non sono reali. Non inserire
      informazioni sanitarie vere.
    </div>
  );
}
