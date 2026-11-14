import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type { Locale } from "@/i18n/routing";

export type SkillGroup = components["schemas"]["SkillGroupDto"];
export type Tool = components["schemas"]["ToolDto"];
export type TimelineEntry = components["schemas"]["TimelineEntryDto"];
export type Category = components["schemas"]["CategoryDto"];
export type Settings = Record<string, unknown>;

/**
 * Public content for the site, read on the server and cached per locale.
 * Tags match the API's cache tags, so /api/revalidate can refresh exactly what an admin edited.
 * If the API is unreachable the section renders with empty data instead of failing the page.
 */
async function load<T>(fetcher: () => Promise<{ data?: T }>, fallback: T): Promise<T> {
  try {
    const { data } = await fetcher();
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

export async function getSettings(locale: Locale): Promise<Settings> {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  return load(() => api.GET("/api/v1/settings", { params: { query: { locale } } }) as Promise<{ data?: Settings }>, {});
}

export async function getSkills(locale: Locale): Promise<SkillGroup[]> {
  "use cache";
  cacheTag("skills");
  cacheLife("hours");
  return load(() => api.GET("/api/v1/skills", { params: { query: { locale } } }), []);
}

export async function getTools(): Promise<Tool[]> {
  "use cache";
  cacheTag("tools");
  cacheLife("hours");
  return load(() => api.GET("/api/v1/tools"), []);
}

export async function getTimeline(locale: Locale): Promise<TimelineEntry[]> {
  "use cache";
  cacheTag("timeline");
  cacheLife("hours");
  return load(() => api.GET("/api/v1/timeline", { params: { query: { locale } } }), []);
}

export async function getCategories(locale: Locale): Promise<Category[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("hours");
  return load(() => api.GET("/api/v1/categories", { params: { query: { locale } } }), []);
}

export type ProjectCard = components["schemas"]["ProjectCardDto"];
export type Testimonial = components["schemas"]["TestimonialDto"];

/** Published projects for the grid (first page of 24; featured first). */
export async function getProjects(locale: Locale): Promise<ProjectCard[]> {
  "use cache";
  cacheTag("projects");
  cacheLife("hours");
  const page = await load(
    () => api.GET("/api/v1/projects", { params: { query: { locale, page: 1, pageSize: 24 } } }),
    undefined,
  );
  return page?.items ?? [];
}

/** Approved reviews for the ticker. */
export async function getTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheTag("testimonials");
  cacheLife("hours");
  return load(() => api.GET("/api/v1/testimonials"), []);
}

/** Typed reads from the settings bag (values are JSON). */
export const setting = {
  text: (s: Settings, key: string, fallback = ""): string => (typeof s[key] === "string" ? (s[key] as string) : fallback),
  list: (s: Settings, key: string): string[] => (Array.isArray(s[key]) ? (s[key] as unknown[]).filter((x): x is string => typeof x === "string") : []),
  object: <T extends object>(s: Settings, key: string): Partial<T> =>
    s[key] && typeof s[key] === "object" && !Array.isArray(s[key]) ? (s[key] as Partial<T>) : {},
};
