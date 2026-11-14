import "server-only";

/**
 * CSRF guard for cookie-authenticated writes: the request must come from our own origin.
 * SameSite=Lax cookies already block cross-site POSTs in modern browsers; this is the second layer.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
