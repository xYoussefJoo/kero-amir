/** Posts a public form through /api/forms/[form]. Returns null on success, or a message key / API message. */
export async function submitForm(form: "testimonial" | "contact", body: unknown): Promise<string | null> {
  try {
    const response = await fetch(`/api/forms/${form}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.ok) return null;
    const data = (await response.json().catch(() => ({}))) as { error?: string };
    return data.error ?? "unavailable";
  } catch {
    return "unavailable";
  }
}
