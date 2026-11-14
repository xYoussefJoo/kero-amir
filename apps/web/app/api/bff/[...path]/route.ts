import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { apiUrl } from "@/lib/server/env";
import { isSameOrigin } from "@/lib/server/origin";
import { clearSession, Cookies, refreshSession, setSession } from "@/lib/server/session";
import { isAllowedBffPath } from "@/lib/server/bff";

/**
 * Admin calls from the browser: /api/bff/admin/... → API /api/v1/admin/... with the Bearer token from the cookie.
 * On 401 it refreshes once (shared with concurrent requests) and retries.
 */
async function handle(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!isAllowedBffPath(path)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (request.method !== "GET" && !isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const jar = await cookies();
  const target = apiUrl("/" + path.map(encodeURIComponent).join("/")) + new URL(request.url).search;
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await request.arrayBuffer();

  const send = (token: string | undefined) =>
    fetch(target, {
      method: request.method,
      headers: {
        ...(request.headers.get("content-type") ? { "content-type": request.headers.get("content-type")! } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });

  let response = await send(jar.get(Cookies.access)?.value);
  let refreshed: Awaited<ReturnType<typeof refreshSession>> = null;

  if (response.status === 401) {
    const refreshToken = jar.get(Cookies.refresh)?.value;
    refreshed = refreshToken ? await refreshSession(refreshToken) : null;
    if (refreshed) response = await send(refreshed.accessToken);
  }

  const result = new NextResponse(response.body, {
    status: response.status,
    headers: { "content-type": response.headers.get("content-type") ?? "application/json" },
  });
  if (refreshed) setSession(result.cookies, refreshed);
  else if (response.status === 401) clearSession(result.cookies);
  return result;
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
