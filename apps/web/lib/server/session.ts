import "server-only";
import type { NextResponse } from "next/server";
import type { components } from "@/lib/api/schema";
import { apiUrl } from "./env";

type AuthTokens = components["schemas"]["AuthTokens"];

/** httpOnly cookies on the web origin. The browser never sees a token (BFF pattern, see docs/decisions.md #4). */
export const Cookies = {
  access: "ka_at",
  refresh: "ka_rt",
  twoFactor: "ka_2fa",
} as const;

const secure = process.env.NODE_ENV === "production";

function maxAge(expiresAt: string): number {
  return Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000));
}

/** Anything with a Next.js cookie jar: a NextResponse's cookies or `await cookies()` in a route handler. */
type CookieJar = Pick<NextResponse["cookies"], "set" | "delete">;

export function setSession(jar: CookieJar, tokens: AuthTokens) {
  jar.set(Cookies.access, tokens.accessToken, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: maxAge(tokens.accessTokenExpiresAt),
  });
  jar.set(Cookies.refresh, tokens.refreshToken, {
    httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: maxAge(tokens.refreshTokenExpiresAt),
  });
  jar.delete(Cookies.twoFactor);
}

export function clearSession(jar: CookieJar) {
  jar.delete(Cookies.access);
  jar.delete(Cookies.refresh);
  jar.delete(Cookies.twoFactor);
}

export function setTwoFactorChallenge(jar: CookieJar, challenge: string) {
  // Same lifetime as the API's challenge token (5 minutes).
  jar.set(Cookies.twoFactor, challenge, { httpOnly: true, secure, sameSite: "lax", path: "/", maxAge: 5 * 60 });
}

// Refresh tokens rotate on every use, and replaying a used one ends the session (API decision #23).
// Concurrent requests holding the same refresh token must therefore share ONE refresh call.
const inFlight = new Map<string, Promise<AuthTokens | null>>();

export function refreshSession(refreshToken: string): Promise<AuthTokens | null> {
  let pending = inFlight.get(refreshToken);
  if (!pending) {
    pending = callRefresh(refreshToken).finally(() => {
      // Keep the result briefly so requests that arrive just after still reuse it.
      setTimeout(() => inFlight.delete(refreshToken), 10_000);
    });
    inFlight.set(refreshToken, pending);
  }
  return pending;
}

async function callRefresh(refreshToken: string): Promise<AuthTokens | null> {
  try {
    const response = await fetch(apiUrl("/auth/refresh"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? ((await response.json()) as AuthTokens) : null;
  } catch {
    return null;
  }
}
