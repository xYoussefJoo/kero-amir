import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { getSkills, getTools } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { MagneticTilt } from "@/components/puzzle/MagneticTilt";
import { SectionHeader } from "@/components/puzzle/SectionHeader";
import { pieceStyle } from "@/components/puzzle/scatter";
import { PuzzleLogo2D } from "@/components/hero/PuzzleLogo2D";

export async function ToolkitSection({ locale }: { locale: Locale }) {
  const [groups, tools, t] = await Promise.all([
    getSkills(locale),
    getTools(),
    getTranslations({ locale, namespace: "Toolkit" }),
  ]);
  const orbit = tools.filter((tool) => tool.showInOrbit);

  return (
    <PuzzleAssemble as="section" id="toolkit" className="mx-auto flex w-full max-w-6xl scroll-mt-8 flex-col gap-16 px-4 py-24 sm:px-6">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <SectionHeader label={t("label")} title={t("title")} intro={t("intro")} />

        {orbit.length > 0 && (
          // Tools circle the K on a tilted ring, passing behind and in front of it like the logo's swoosh.
          <div className="pz-piece orbit mx-auto aspect-square w-full max-w-md" style={pieceStyle(3, 4)} data-static="">
            <div className="orbit__stage">
              <PuzzleLogo2D className="orbit__logo" />
              <ul className="orbit__ring" aria-label={t("orbitLabel")}>
                {orbit.map((tool, i) => {
                  const angle = (i / orbit.length) * Math.PI * 2;
                  return (
                    <li
                      key={tool.id}
                      className="orbit__slot"
                      style={{ left: `${50 + Math.cos(angle) * 46}%`, top: `${50 + Math.sin(angle) * 46}%` } as CSSProperties}
                    >
                      <span className="orbit__face">
                        <span className="orbit__chip">
                          <span aria-hidden className="size-2.5 rounded-full" style={{ background: tool.color ?? "var(--primary)" }} />
                          {tool.name.replace(/^Adobe\s+/, "")}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      {groups.length > 0 && (
        <ul className="grid gap-x-6 gap-y-12 md:grid-cols-3">
          {groups.map((group, gi) => (
            <li key={group.id} className="pz-piece" style={pieceStyle(5 + gi, 4, 1.3)}>
              <MagneticTilt className="h-full">
                <div className="pz-card flex h-full flex-col gap-5 px-6 pb-7 pt-9">
                  <h3 className="font-display text-xl font-semibold">{group.name}</h3>
                  <ul className="flex flex-col gap-3.5">
                    {group.skills.map((skill, si) => (
                      <li key={skill.id} className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span>{skill.name}</span>
                          <span className="font-mono text-xs text-muted">{skill.level}%</span>
                        </div>
                        <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-muted/15">
                          <span
                            className="pz-bar block h-full rounded-full bg-primary"
                            style={{ "--lvl": Number(skill.level) / 100, "--d": `${0.35 + gi * 0.1 + si * 0.05}s` } as CSSProperties}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </MagneticTilt>
            </li>
          ))}
        </ul>
      )}
    </PuzzleAssemble>
  );
}
