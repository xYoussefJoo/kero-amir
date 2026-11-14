/** The BFF only forwards admin API calls: it must never become an open proxy to the rest of the API. */
export function isAllowedBffPath(segments: readonly string[]): boolean {
  return (
    segments.length >= 2 &&
    segments[0] === "admin" &&
    segments.every((s) => s.length > 0 && s !== "." && s !== ".." && !s.includes("/") && !s.includes("\\"))
  );
}
