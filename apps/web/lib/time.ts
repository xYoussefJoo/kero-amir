const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
];

/** "3 hours ago", "yesterday", "2 weeks ago". */
export function ago(iso: string, now: number): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  for (const [unit, size] of STEPS) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  return "just now";
}
