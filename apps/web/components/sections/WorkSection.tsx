import { getTranslations } from "next-intl/server";
import { getCategories } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { MagneticTilt } from "@/components/puzzle/MagneticTilt";
import { SectionHeader } from "@/components/puzzle/SectionHeader";
import { pieceStyle } from "@/components/puzzle/scatter";

/** Kero's disciplines as puzzle tiles. Project cards join them once projects exist (Phase 3). */
export async function WorkSection({ locale }: { locale: Locale }) {
  const [categories, t] = await Promise.all([getCategories(locale), getTranslations({ locale, namespace: "Work" })]);

  return (
    <PuzzleAssemble as="section" id="work" className="mx-auto flex w-full max-w-6xl scroll-mt-8 flex-col gap-16 px-4 py-24 sm:px-6">
      <SectionHeader label={t("label")} title={t("title")} intro={t("intro")} />

      {categories.length > 0 && (
        <ul className="grid gap-x-6 gap-y-12 sm:grid-cols-2">
          {categories.map((category, i) => (
            <li key={category.id} className="pz-piece" style={pieceStyle(3 + i, 6, 1.5)}>
              <MagneticTilt className="h-full">
                <div className={`pz-card work-tile work-tile--${i % 4} flex min-h-56 flex-col justify-between gap-8 px-7 pb-7 pt-9`}>
                  <span className="font-mono text-xs tracking-[0.2em] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <div className="flex items-end justify-between gap-4">
                    <h3 className="font-display text-3xl font-semibold leading-tight sm:text-4xl">{category.name}</h3>
                    <span className="shrink-0 font-mono text-xs text-muted">{t("soon")}</span>
                  </div>
                </div>
              </MagneticTilt>
            </li>
          ))}
        </ul>
      )}
    </PuzzleAssemble>
  );
}
