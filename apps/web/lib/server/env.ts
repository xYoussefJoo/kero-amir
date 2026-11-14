import "server-only";

/** Base URL of the .NET API, server-side only (e.g. http://localhost:5080 or https://kero-amir.runasp.net). */
export const API_URL = (process.env.API_URL ?? "http://localhost:5080").replace(/\/+$/, "");

/** Absolute URL for an API v1 path, e.g. apiUrl("/auth/login"). */
export function apiUrl(path: string): string {
  return `${API_URL}/api/v1${path.startsWith("/") ? path : `/${path}`}`;
}
