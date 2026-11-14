import { NextResponse } from "next/server";
import type { components } from "@/lib/api/schema";
import { apiUrl } from "@/lib/server/env";
import { problemMessage } from "@/lib/server/problem";
import { setSession, setTwoFactorChallenge } from "@/lib/server/session";
import { isSameOrigin } from "@/lib/server/origin";

type LoginResponse = components["schemas"]["LoginResponse"];

/** Step 1 of sign-in. Returns { requiresTwoFactor } only; tokens and the 2FA challenge go into httpOnly cookies. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const response = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: await request.text(),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    return NextResponse.json({ error: await problemMessage(response) }, { status: response.status });
  }

  const login = (await response.json()) as LoginResponse;
  const result = NextResponse.json({ requiresTwoFactor: login.requiresTwoFactor });
  if (login.requiresTwoFactor && login.challengeToken) setTwoFactorChallenge(result.cookies, login.challengeToken);
  else if (login.tokens) setSession(result.cookies, login.tokens);
  return result;
}
