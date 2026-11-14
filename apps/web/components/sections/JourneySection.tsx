import { getFormatter, getTranslations } from "next-intl/server";
import { getTimeline } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { MagneticTilt } from "@/components/puzzle/MagneticTilt";
import { SectionHeader } from "@/components/puzzle/SectionHeader";
import { pieceStyle } from "@/components/puzzle/scatter";
import { JourneyLine } from "./JourneyLine";

export async function JourneySection({ locale }: { locale: Locale }) {
  const [entries, t, format] = await Promise.all([
    getTimeline(locale),
    getTranslations({ locale, namespace: "Journey" }),
    getFormatter({ locale }),
  ]);
  if (entries.length === 0) return null;

  const year = (date: string) => format.dateTime(new Date(date), { year: "numeric" });
  // "2023 — 2024", "2025 — Present", or just "2024" when it starts and ends in the same year.
  const span = (start: string, end?: string | null) =>
    !end ? `${year(start)} — ${t("present")}` : year(start) === year(end) ? year(start) : `${year(start)} — ${year(end)}`;

  return (
    <PuzzleAssemble as="section" id="journey" className="mx-auto flex w-full max-w-6xl scroll-mt-8 flex-col gap-16 px-4 py-24 sm:px-6" threshold={0.1}>
      <SectionHeader label={t("label")} title={t("title")} intro={t("intro")} />

      <JourneyLine>
        {entries.map((entry, i) => (
          <li key={entry.id} className="journey__entry pz-piece" style={pieceStyle(3 + i, 5, 1.2)}>
            <span data-node className="journey__node" aria-hidden />
            <MagneticTilt className="journey__card">
              <article className="pz-card flex flex-col gap-2 px-6 pb-6 pt-8">
                <p className="font-mono text-xs tracking-[0.15em] text-muted">
                  {span(entry.startDate, entry.endDate)}
                  <span className="ms-2 rounded-full bg-accent px-2 py-0.5 text-[0.65rem] font-semibold tracking-normal text-on-accent">
                    {t(`kind.${entry.kind as "Work" | "Education" | "Award" | "Milestone"}`)}
                  </span>
                </p>
                <h3 className="font-display text-xl font-semibold leading-snug">{entry.title}</h3>
                {(entry.organization || entry.location) && (
                  <p className="text-sm font-medium text-primary">
                    {[entry.organization, entry.location].filter(Boolean).join(" · ")}
                  </p>
                )}
                {entry.description && <p className="text-sm text-muted">{entry.description}</p>}
              </article>
            </MagneticTilt>
          </li>
        ))}
      </JourneyLine>
    </PuzzleAssemble>
  );
}
