/** The BFF only forwards admin API calls: it must never become an open proxy to the rest of the API. */
export function isAllowedBffPath(segments: readonly string[]): boolean {
  return (
    segments.length >= 2 &&
    segments[0] === "admin" &&
    segments.every((s) => s.length > 0 && s !== "." && s !== ".." && !s.includes("/") && !s.includes("\\"))
  );
}

/**
 * Site cache tags (see lib/content.ts) that an admin change under this path makes stale. Category and tool names
 * appear on project cards, so those changes refresh projects too.
 */
const TAGS_BY_RESOURCE: Record<string, readonly string[]> = {
  testimonials: ["testimonials"],
  projects: ["projects"],
  categories: ["categories", "projects"],
  tools: ["tools", "projects"],
  "skill-groups": ["skills"],
  skills: ["skills"],
  timeline: ["timeline"],
  settings: ["settings"],
};

export function tagsForBffPath(segments: readonly string[]): readonly string[] {
  return TAGS_BY_RESOURCE[segments[1]] ?? [];
}
