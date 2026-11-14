import { getTranslations } from "next-intl/server";
import { getCategories, getProjects } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { MagneticTilt } from "@/components/puzzle/MagneticTilt";
import { SectionHeader } from "@/components/puzzle/SectionHeader";
import { ProjectCover } from "@/components/projects/ProjectCover";
import { ProjectsGrid } from "@/components/projects/ProjectsGrid";

/** Country code → flag emoji (regional indicator letters). */
const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

export async function ProjectsSection({ locale }: { locale: Locale }) {
  const [projects, categories, t] = await Promise.all([
    getProjects(locale),
    getCategories(locale),
    getTranslations({ locale, namespace: "Work" }),
  ]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const used = new Set(projects.flatMap((p) => p.categories.map((c) => c.slug)));

  const items = projects.map((project, i) => ({
    id: project.id,
    featured: project.isFeatured,
    categories: project.categories.map((c) => c.slug),
    card: (
      <MagneticTilt className="h-full">
        <article className="project-card pz-card group">
          <div className="project-card__cover">
            <ProjectCover title={project.title} image={project.coverImageUrl} accent={project.accentColor} priority={i === 0} />
            {project.highlight && <span className="project-card__badge">{project.highlight}</span>}
          </div>
          <div className="project-card__body">
            <p className="font-mono text-[0.7rem] tracking-[0.15em] text-muted">
              {project.categories.map((c) => c.name.toUpperCase()).join(" · ")}
            </p>
            <h3 className="font-display text-xl font-semibold leading-snug sm:text-2xl">{project.title}</h3>
            <p className="project-card__summary text-sm text-muted">{project.summary}</p>
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
              <ul className="flex flex-wrap gap-1.5">
                {project.tools.slice(0, 3).map((tool) => (
                  <li key={tool.slug} className="rounded-full bg-muted/10 px-2.5 py-1 text-xs font-medium">
                    {tool.name.replace(/^Adobe\s+/, "")}
                  </li>
                ))}
              </ul>
              <span className="text-sm text-muted">
                {project.year}{" "}
                {project.countries.map((c) => (
                  <span key={c} role="img" aria-label={regions.of(c) ?? c}>{flag(c)}</span>
                ))}
              </span>
            </div>
          </div>
        </article>
      </MagneticTilt>
    ),
  }));

  return (
    <PuzzleAssemble as="section" id="work" className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-12 px-4 py-24 sm:px-6" threshold={0.1}>
      <SectionHeader label={t("label")} title={t("title")} intro={t("intro")} />
      <ProjectsGrid
        items={items}
        filters={categories.filter((c) => used.has(c.slug)).map((c) => ({ slug: c.slug, name: c.name }))}
        allLabel={t("all")}
        emptyLabel={t("empty")}
      />
    </PuzzleAssemble>
  );
}
