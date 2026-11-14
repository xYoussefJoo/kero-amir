import "server-only";
import createClient from "openapi-fetch";
import { API_URL } from "@/lib/server/env";
import type { paths } from "./schema";

/** No call may hang a render: a cold API host can take ~15 s to wake up. */
const TIMEOUT_MS = 8_000;

/**
 * fetch with a timeout. Reads (GET) get one retry: the first call usually wakes a cold host, so the retry lands on a
 * warm one. Writes are never retried, so a form can't be submitted twice.
 */
async function fetchWithTimeout(request: Request): Promise<Response> {
  const attempts = request.method === "GET" ? 2 : 1;
  for (let attempt = 1; ; attempt++) {
    try {
      return await fetch(request.clone(), { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      if (attempt >= attempts) throw error;
    }
  }
}

/**
 * Typed client for the .NET API, generated from its OpenAPI document (lib/api/schema.d.ts, never hand-edit).
 * Server-side only: public pages call it from Server Components; admin calls pass the user's token.
 */
export const api = createClient<paths>({ baseUrl: API_URL, fetch: fetchWithTimeout });

export function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}
