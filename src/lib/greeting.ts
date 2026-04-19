import * as React from "react";

/**
 * Returns the localized greeting matching the user's *local* wall clock
 * time. Pure helper — usable on both server and client. For client
 * components that want SSR-safe rendering, use `useGreeting` below.
 */
export function greeting(hour: number = new Date().getHours()): string {
  if (hour < 6) return "Ciao";
  if (hour < 12) return "Buongiorno";
  if (hour < 18) return "Buon pomeriggio";
  return "Buonasera";
}

/**
 * SSR-safe greeting hook. First render (both on server and the
 * matching hydration pass) returns the neutral "Ciao"; a client-only
 * effect swaps it to the time-of-day variant after mount. This avoids
 * hydration mismatches when the server's timezone differs from the
 * user's.
 */
export function useGreeting(): string {
  const [value, setValue] = React.useState<string>("Ciao");
  React.useEffect(() => {
    setValue(greeting());
  }, []);
  return value;
}
