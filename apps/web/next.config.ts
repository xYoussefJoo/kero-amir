import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isDev = process.env.NODE_ENV !== "production";

// A Vercel build without these would quietly ship empty sections (API_URL falls back to localhost) and forms that
// rate-limit every visitor together. Fail the build instead.
if (process.env.VERCEL) {
  const missing = ["API_URL", "FORWARDING_SECRET"].filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Set these Vercel environment variables: ${missing.join(", ")} (see apps/web/.env.example).`);
}

// Everything (fonts, images, 3D, API calls via the BFF) is served from our own origin.
// 'unsafe-inline' scripts: the theme script and Next's inline bootstrap; dev also needs eval for HMR.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  `connect-src 'self'${isDev ? " ws:" : ""}`,
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Brand images never change name, but may change content: a day fresh, a week stale-while-revalidate.
      { source: "/brand/:file*", headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }] },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

export default withNextIntl(nextConfig);
