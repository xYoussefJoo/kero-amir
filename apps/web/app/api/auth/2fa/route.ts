import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { components } from "@/lib/api/schema";
import { apiUrl } from "@/lib/server/env";
import { isSameOrigin } from "@/lib/server/origin";
import { problemMessage } from "@/lib/server/problem";
import { Cookies, setSession } from "@/lib/server/session";

type AuthTokens = components["schemas"]["AuthTokens"];

/** Step 2 of sign-in: the authenticator code, paired with the challenge kept in an httpOnly cookie. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const challengeToken = (await cookies()).get(Cookies.twoFactor)?.value;
  if (!challengeToken) {
    return NextResponse.json({ error: "The sign-in step expired. Sign in again." }, { status: 401 });
  }

  const { code } = (await request.json()) as { code?: string };
  const response = await fetch(apiUrl("/auth/2fa"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ challengeToken, code: code ?? "" }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return NextResponse.json({ error: await problemMessage(response) }, { status: response.status });
  }

  const result = NextResponse.json({ ok: true });
  setSession(result.cookies, (await response.json()) as AuthTokens);
  return result;
}
