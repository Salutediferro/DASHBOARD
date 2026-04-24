/**
 * Thin wrapper over `navigator.vibrate` so the app can fire haptic
 * feedback without scattering defensive checks at every call site.
 *
 * Platform reality:
 *  - Android Chrome / Samsung Internet: supported → user feels a tap.
 *  - iOS Safari: not supported (Apple disabled the Vibration API years
 *    ago), the call is a no-op. When we ship as a real PWA or wrap the
 *    site in the Expo app (`sdf-mobile/`), the Taptic Engine becomes
 *    reachable — at that point this module is where to add the bridge.
 *  - Desktop / no hardware: no-op.
 *
 * All functions fail silently on unsupported platforms. They also
 * respect `prefers-reduced-motion: reduce` — we treat reduced motion as
 * "also prefer quiet haptics" even though the spec is about motion,
 * because a user who asks for less animation usually wants less sensory
 * noise in general.
 */

function canVibrate(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  if (typeof navigator.vibrate !== "function") return false;
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return false;
  }
  return true;
}

function fire(pattern: number | number[]): void {
  if (!canVibrate()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Some browsers throw on blocked user-activation context. Swallow —
    // missing haptic is never worth a runtime error.
  }
}

export const haptic = {
  /** Subtle tap — ~10ms. Primary button press, toggle flip. */
  tap: () => fire(10),
  /** Stronger single pulse — ~20ms. Submit / form save. */
  impact: () => fire(20),
  /** Positive two-beat — "action completed". */
  success: () => fire([12, 40, 18]),
  /** Sharp alerting pulse — "action failed / destructive done". */
  error: () => fire([30, 60, 30]),
  /** Very light tick — list row selection, nav change. Use sparingly. */
  select: () => fire(5),
};
