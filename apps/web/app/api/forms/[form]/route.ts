import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/server/env";
import { isSameOrigin } from "@/lib/server/origin";
import { problemMessage } from "@/lib/server/problem";

/** Public forms → API endpoints. Anything else is a 404 (this is not an open proxy). */
const TARGETS = { testimonial: "/testimonials", contact: "/contact" } as const;

/** The visitor's IP as seen by our host (first X-Forwarded-For hop on Vercel/most proxies). */
function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip");
}

/**
 * Public form submit (reviews, contact). Same-origin only. Forwards the visitor's IP with the shared
 * FORWARDING_SECRET so the API rate-limits each visitor separately instead of all of them as "the web server".
 */
export async function POST(request: Request, { params }: { params: Promise<{ form: string }> }) {
  const { form } = await params;
  const target = TARGETS[form as keyof typeof TARGETS];
  if (!target) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const headers: Record<string, string> = { "content-type": "application/json" };
  const ip = clientIp(request);
  const secret = process.env.FORWARDING_SECRET;
  if (ip && secret) {
    headers["X-Client-IP"] = ip;
    headers["X-Forwarded-Secret"] = secret;
  }

  const response = await fetch(apiUrl(target), {
    method: "POST",
    headers,
    body: await request.text(),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);

  if (!response) return NextResponse.json({ error: "unavailable" }, { status: 503 });
  if (response.status === 429) return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  if (!response.ok) return NextResponse.json({ error: await problemMessage(response) }, { status: response.status });
  return NextResponse.json({ ok: true }, { status: 202 });
}
