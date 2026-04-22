/**
 * Extract a human-readable error message from a failed `fetch` response.
 *
 * Our API routes return errors in three shapes:
 *   1. `{ error: "string" }`              — hand-written messages
 *   2. `{ error: ZodIssue[] }`            — validation failures
 *   3. empty / non-JSON body              — framework-level 500s
 *
 * Before this helper each caller wrote its own `err.error ?? "Errore"`,
 * which meant a Zod array came out as "Errore" and a 500 with no body
 * came out as "Errore" — the user couldn't tell a validation problem
 * from a real crash. This helper normalises all three into a single
 * readable string.
 */
export async function readApiError(
  res: Response,
  fallback = "Errore",
): Promise<string> {
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    // non-JSON body (HTML error page, empty 500, …) → fall through
  }

  if (body && typeof body === "object" && "error" in body) {
    const err = (body as { error: unknown }).error;

    if (typeof err === "string" && err.trim().length > 0) return err;

    if (Array.isArray(err)) {
      // Zod ships { path: string[], message: string, … } per issue.
      const msgs = err
        .map((i) => {
          if (i && typeof i === "object" && "message" in i) {
            const m = (i as { message: unknown }).message;
            if (typeof m === "string") {
              const path =
                "path" in i && Array.isArray((i as { path: unknown[] }).path)
                  ? (i as { path: unknown[] }).path.join(".")
                  : "";
              return path ? `${path}: ${m}` : m;
            }
          }
          return null;
        })
        .filter((s): s is string => !!s && s.trim().length > 0);
      if (msgs.length > 0) return msgs.join(" · ");
    }
  }

  return `${fallback} (${res.status})`;
}
