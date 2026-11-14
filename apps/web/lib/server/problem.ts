import "server-only";

/** Reads an RFC 7807 ProblemDetails body into a short, user-facing message. */
export async function problemMessage(response: Response, fallback = "Something went wrong. Try again."): Promise<string> {
  try {
    const body = (await response.json()) as { title?: string; errors?: Record<string, string[]> };
    const firstFieldError = body.errors ? Object.values(body.errors).flat()[0] : undefined;
    return firstFieldError ?? body.title ?? fallback;
  } catch {
    return fallback;
  }
}
