import { apiUrl } from "@/lib/server/env";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Uploaded images (e.g. project covers) on the site's own origin: the CSP stays 'self', next/image treats them as
 * local, and the CDN keeps each one for a year (an id never changes its image).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) return new Response("Not found", { status: 404 });

  const upstream = await fetch(apiUrl(`/media/${id}`), { signal: AbortSignal.timeout(15_000) }).catch(() => null);
  if (!upstream) return new Response("Image unavailable", { status: 502, headers: { "cache-control": "no-store" } });
  if (!upstream.ok) return new Response("Not found", { status: upstream.status === 404 ? 404 : 502, headers: { "cache-control": "no-store" } });

  return new Response(upstream.body, {
    headers: {
      "content-type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
