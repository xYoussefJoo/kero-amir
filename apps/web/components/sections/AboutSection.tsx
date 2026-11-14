import { getTranslations } from "next-intl/server";
import { getSettings, setting } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { MagneticTilt } from "@/components/puzzle/MagneticTilt";
import { SectionHeader } from "@/components/puzzle/SectionHeader";
import { CountUp } from "@/components/puzzle/CountUp";
import { pieceStyle } from "@/components/puzzle/scatter";

type Stats = { years: number; projects: number; countries: number; satisfaction: number };

export async function AboutSection({ locale }: { locale: Locale }) {
  const [settings, t] = await Promise.all([getSettings(locale), getTranslations({ locale, namespace: "About" })]);
  const stats = setting.object<Stats>(settings, "heroStats");
  const capabilities = setting.list(settings, "about.capabilities");

  const tiles = [
    { value: stats.years, suffix: "+", label: t("statYears") },
    { value: stats.projects, suffix: "+", label: t("statProjects") },
    { value: stats.countries, suffix: "", label: t("statCountries") },
    { value: stats.satisfaction, suffix: "%", label: t("statSatisfaction") },
  ].filter((tile): tile is { value: number; suffix: string; label: string } => typeof tile.value === "number");

  return (
    <PuzzleAssemble as="section" id="about" className="mx-auto flex w-full max-w-6xl scroll-mt-8 flex-col gap-14 px-4 py-24 sm:px-6">
      <SectionHeader
        label={t("label")}
        title={setting.text(settings, "about.title", t("fallbackTitle"))}
        intro={setting.text(settings, "about.intro")}
      />

      <div className="grid gap-10 lg:grid-cols-[1.2fr_1fr]">
        {/* Philosophy quote: one piece, accented like the logo's orange blade. */}
        <blockquote className="pz-piece relative border-s-4 border-accent ps-6" style={pieceStyle(3, 2)}>
          <p className="font-display text-2xl leading-snug sm:text-3xl">
            {setting.text(settings, "about.philosophy")}
          </p>
        </blockquote>

        {capabilities.length > 0 && (
          <ul className="flex flex-col gap-3">
            {capabilities.map((item, i) => (
              <li key={item} className="pz-piece flex items-start gap-3" style={pieceStyle(4 + i, 2)}>
                <span aria-hidden className="mt-2 size-2.5 shrink-0 rotate-45 rounded-[3px] bg-primary" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {tiles.length > 0 && (
        <ul className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <li key={tile.label} className="pz-piece" style={pieceStyle(10 + i, 3, 1.4)}>
              <MagneticTilt>
                <div className="pz-card flex flex-col gap-2 px-6 pb-6 pt-8">
                  <span className="font-display text-5xl font-semibold text-primary">
                    <CountUp value={tile.value} suffix={tile.suffix} />
                  </span>
                  <span className="text-sm text-muted">{tile.label}</span>
                </div>
              </MagneticTilt>
            </li>
          ))}
        </ul>
      )}
    </PuzzleAssemble>
  );
}
