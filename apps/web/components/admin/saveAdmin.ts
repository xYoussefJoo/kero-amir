/** Result of an admin write: the saved object, or the messages to show next to the form. */
export type SaveResult<T> = { ok: true; data: T } | { ok: false; messages: string[] };

/**
 * POST/PUT a form to the BFF and read the API's answer. Validation problems (400) come back as a list of messages,
 * a taken slug (409) as its own message, so the form can show exactly what to fix.
 */
export async function saveAdmin<T>(path: string, method: "POST" | "PUT", body: unknown): Promise<SaveResult<T>> {
  const response = await fetch(`/api/bff/admin/${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).catch(() => null);

  if (!response) return { ok: false, messages: ["Couldn't reach the server. Check your connection and try again."] };
  if (response.ok) return { ok: true, data: (await response.json()) as T };
  if (response.status === 401) return { ok: false, messages: ["Your session ended. Sign in again."] };

  const problem = (await response.json().catch(() => ({}))) as { title?: string; detail?: string; errors?: Record<string, string[]> };
  const messages = problem.errors ? [...new Set(Object.values(problem.errors).flat())] : [problem.detail ?? problem.title ?? "That didn't save. Try again."];
  return { ok: false, messages };
}
