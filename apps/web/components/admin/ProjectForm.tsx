"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import type { components } from "@/lib/api/schema";
import { z } from "@/lib/zod";
import { AdminField, FormMessages } from "./AdminField";
import { saveAdmin } from "./saveAdmin";

type Project = components["schemas"]["ProjectAdminDto"];
type Option = { id: string; label: string };

const slugify = (text: string) =>
  text.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const text = (max: number) => z.string().trim().max(max, `At most ${max} characters.`);

// Mirrors the API validator (ProjectInputValidator); the API stays the source of truth.
const schema = z.object({
  slug: z.string().trim().min(1, "Required.").max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and single hyphens."),
  year: z.coerce.number<string>().int().min(1990, "From 1990.").max(2100, "Up to 2100."),
  countries: z.string().trim().regex(/^([A-Za-z]{2}(\s*,\s*[A-Za-z]{2}){0,9})?$/, "Two-letter codes separated by commas, e.g. US, DE."),
  coverImageUrl: z.string().trim().max(500).refine((u) => u === "" || u.startsWith("https://") || u.startsWith("/"), "Use an https:// link or a site path."),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  isFeatured: z.boolean(),
  categoryIds: z.array(z.string()).max(10),
  toolIds: z.array(z.string()).max(20),
  en: z.object({ title: text(150).min(1, "Required."), summary: text(600).min(1, "Required."), highlight: text(80) }),
  de: z.object({ title: text(150), summary: text(600), highlight: text(80) }),
}).refine((v) => (v.de.title === "") === (v.de.summary === ""), { path: ["de", "summary"], message: "Fill in both the German title and summary, or neither." });

type Values = z.input<typeof schema>;

function initialValues(project?: Project): Values {
  const t = (locale: string) => project?.translations.find((x) => x.locale === locale);
  return {
    slug: project?.slug ?? "",
    year: String(project?.year ?? new Date().getFullYear()),
    countries: project?.countries.join(", ") ?? "",
    coverImageUrl: project?.coverImageUrl ?? "",
    accentColor: project?.accentColor ?? "#2546EB",
    isFeatured: project?.isFeatured ?? false,
    categoryIds: project?.categoryIds ?? [],
    toolIds: project?.toolIds ?? [],
    en: { title: t("en")?.title ?? "", summary: t("en")?.summary ?? "", highlight: t("en")?.highlight ?? "" },
    de: { title: t("de")?.title ?? "", summary: t("de")?.summary ?? "", highlight: t("de")?.highlight ?? "" },
  };
}

/** Create or edit a project. New projects are saved as drafts; publishing is a separate, deliberate step. */
export function ProjectForm({ project, categories, tools }: { project?: Project; categories: Option[]; tools: Option[] }) {
  const router = useRouter();
  const [messages, setMessages] = useState<string[]>([]);
  const [slugTouched, setSlugTouched] = useState(!!project);
  const form = useForm<Values, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues: initialValues(project) });
  const { register, handleSubmit, setValue, control, formState: { errors, isSubmitting } } = form;
  const [categoryIds, toolIds, accentColor] = useWatch({ control, name: ["categoryIds", "toolIds", "accentColor"] });

  const toggle = (name: "categoryIds" | "toolIds", id: string) => {
    const current = name === "categoryIds" ? categoryIds : toolIds;
    setValue(name, current.includes(id) ? current.filter((x) => x !== id) : [...current, id], { shouldDirty: true });
  };

  const onSubmit = handleSubmit(async (v) => {
    setMessages([]);
    const translations = [{ locale: "en", ...v.en }, ...(v.de.title ? [{ locale: "de", ...v.de }] : [])]
      .map((t) => ({ ...t, highlight: t.highlight || null }));
    const body = {
      slug: v.slug, year: v.year,
      countries: v.countries ? v.countries.split(",").map((c) => c.trim().toUpperCase()) : [],
      coverImageUrl: v.coverImageUrl || null, accentColor: v.accentColor.toUpperCase(), isFeatured: v.isFeatured,
      categoryIds: v.categoryIds, toolIds: v.toolIds, translations,
    };
    const result = project ? await saveAdmin<Project>(`projects/${project.id}`, "PUT", body) : await saveAdmin<Project>("projects", "POST", body);
    if (!result.ok) return setMessages(result.messages);
    router.push("/admin/projects");
    router.refresh();
  });

  const titleField = register("en.title", {
    onChange: (e) => { if (!slugTouched) setValue("slug", slugify(e.target.value)); },
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <section className="admin-panel">
        <h2 className="font-display text-lg font-semibold">English <span className="text-sm font-normal text-muted">(required)</span></h2>
        <div className="admin-form-grid">
          <AdminField label="Title" error={errors.en?.title?.message} wide><input className="form-input" {...titleField} /></AdminField>
          <AdminField label="Summary" error={errors.en?.summary?.message} wide hint="One or two sentences for the project card.">
            <textarea rows={3} className="form-input" {...register("en.summary")} />
          </AdminField>
          <AdminField label="Highlight" error={errors.en?.highlight?.message} wide hint="Optional short badge, e.g. “Gold foil”.">
            <input className="form-input" {...register("en.highlight")} />
          </AdminField>
        </div>
      </section>

      <section className="admin-panel">
        <h2 className="font-display text-lg font-semibold">German <span className="text-sm font-normal text-muted">(optional: the site falls back to English)</span></h2>
        <div className="admin-form-grid">
          <AdminField label="Title" error={errors.de?.title?.message} wide><input className="form-input" {...register("de.title")} /></AdminField>
          <AdminField label="Summary" error={errors.de?.summary?.message} wide><textarea rows={3} className="form-input" {...register("de.summary")} /></AdminField>
          <AdminField label="Highlight" error={errors.de?.highlight?.message} wide><input className="form-input" {...register("de.highlight")} /></AdminField>
        </div>
      </section>

      <section className="admin-panel">
        <h2 className="font-display text-lg font-semibold">Details</h2>
        <div className="admin-form-grid">
          <AdminField label="Web address" error={errors.slug?.message} hint="Filled in from the title; used in the project link.">
            <input className="form-input font-mono" {...register("slug", { onChange: () => setSlugTouched(true) })} />
          </AdminField>
          <AdminField label="Year" error={errors.year?.message}><input type="number" inputMode="numeric" className="form-input" {...register("year")} /></AdminField>
          <AdminField label="Countries" error={errors.countries?.message} hint="Where the client is, e.g. US, DE.">
            <input className="form-input uppercase" {...register("countries")} />
          </AdminField>
          <AdminField label="Accent colour" error={errors.accentColor?.message} hint="Colours the card when there's no cover image.">
            <span className="flex items-center gap-3">
              <input type="color" className="h-11 w-14 cursor-pointer rounded-lg border border-muted/40 bg-transparent" {...register("accentColor")} />
              <span className="font-mono text-sm">{accentColor.toUpperCase()}</span>
            </span>
          </AdminField>
          <AdminField label="Cover image" error={errors.coverImageUrl?.message} wide hint="Optional: an https:// image link. Uploads come with the media library.">
            <input className="form-input" placeholder="https://" {...register("coverImageUrl")} />
          </AdminField>
          <label className="flex items-center gap-3 text-sm font-medium sm:col-span-2">
            <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" {...register("isFeatured")} />
            Featured: shown big at the start of the grid
          </label>
        </div>
      </section>

      <section className="admin-panel">
        <h2 className="font-display text-lg font-semibold">Categories and tools</h2>
        <ChipGroup label="Categories" options={categories} selected={categoryIds} onToggle={(id) => toggle("categoryIds", id)} empty="No categories yet: add them under Content." />
        <ChipGroup label="Tools" options={tools} selected={toolIds} onToggle={(id) => toggle("toolIds", id)} empty="No tools yet: add them under Content." />
      </section>

      <FormMessages messages={messages} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn--primary">
          {isSubmitting ? "Saving…" : project ? "Save changes" : "Create draft"}
        </button>
        <button type="button" onClick={() => router.push("/admin/projects")} className="admin-btn">Cancel</button>
      </div>
    </form>
  );
}

function ChipGroup({ label, options, selected, onToggle, empty }: {
  label: string; options: Option[]; selected: string[]; onToggle: (id: string) => void; empty: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-sm font-medium">{label}</legend>
      {options.length === 0 ? <p className="text-sm text-muted">{empty}</p> : (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button key={o.id} type="button" aria-pressed={selected.includes(o.id)} onClick={() => onToggle(o.id)} className="admin-toggle">
              {o.label}
            </button>
          ))}
        </div>
      )}
    </fieldset>
  );
}
