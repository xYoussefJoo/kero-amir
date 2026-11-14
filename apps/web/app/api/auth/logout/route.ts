import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/server/env";
import { isSameOrigin } from "@/lib/server/origin";
import { clearSession, Cookies } from "@/lib/server/session";

/** Ends the session on the API (revokes the refresh-token chain) and clears the cookies. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const refreshToken = (await cookies()).get(Cookies.refresh)?.value;
  if (refreshToken) {
    await fetch(apiUrl("/auth/logout"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    }).catch(() => undefined); // signing out locally must work even if the API is down
  }

  const result = NextResponse.json({ ok: true });
  clearSession(result.cookies);
  return result;
}
