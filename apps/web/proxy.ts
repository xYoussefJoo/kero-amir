import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { clearSession, Cookies, refreshSession, setSession } from "./lib/server/session";

const intl = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  return pathname === "/admin" || pathname.startsWith("/admin/") ? guardAdmin(request) : intl(request);
}

/**
 * Admin pages need a session. An expired access token is refreshed here (the only place besides route
 * handlers that may set cookies), so Server Components below always see a valid token.
 */
async function guardAdmin(request: NextRequest) {
  const isLogin = request.nextUrl.pathname === "/admin/login";
  const access = request.cookies.get(Cookies.access)?.value;
  if (access) {
    return isLogin ? NextResponse.redirect(new URL("/admin", request.url)) : NextResponse.next();
  }

  const refreshToken = request.cookies.get(Cookies.refresh)?.value;
  const tokens = refreshToken ? await refreshSession(refreshToken) : null;

  if (!tokens) {
    if (isLogin) return NextResponse.next();
    const response = NextResponse.redirect(new URL("/admin/login", request.url));
    clearSession(response.cookies);
    return response;
  }

  // Pass the fresh token to this request's render and store it in the browser.
  request.cookies.set(Cookies.access, tokens.accessToken);
  request.cookies.set(Cookies.refresh, tokens.refreshToken);
  const response = isLogin
    ? NextResponse.redirect(new URL("/admin", request.url))
    : NextResponse.next({ request: { headers: request.headers } });
  setSession(response.cookies, tokens);
  return response;
}

export const config = {
  // Everything except API routes, uploaded images (/media), Next internals and files with an extension.
  matcher: "/((?!api|media|_next|_vercel|.*\\..*).*)",
};
