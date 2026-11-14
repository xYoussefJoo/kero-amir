import "server-only";
import createClient from "openapi-fetch";
import { API_URL } from "@/lib/server/env";
import type { paths } from "./schema";

/**
 * Typed client for the .NET API, generated from its OpenAPI document (lib/api/schema.d.ts, never hand-edit).
 * Server-side only: public pages call it from Server Components; admin calls pass the user's token.
 */
export const api = createClient<paths>({ baseUrl: API_URL });

export function authHeaders(accessToken: string) {
  return { Authorization: `Bearer ${accessToken}` };
}
