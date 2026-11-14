import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { api } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import type { Locale } from "@/i18n/routing";

export type SkillGroup = components["schemas"]["SkillGroupDto"];
export type Tool = components["schemas"]["ToolDto"];
export type TimelineEntry = components["schemas"]["TimelineEntryDto"];
export type Category = components["schemas"]["CategoryDto"];
export type ProjectCard = components["schemas"]["ProjectCardDto"];
export type Testimonial = components["schemas"]["TestimonialDto"];
export type Settings = Record<string, unknown>;

/*
 * Public content for the site, read on the server and cached per locale.
 * Tags match the API's cache tags, so /api/revalidate can refresh exactly what an admin edited.
 *
 * The cached readers throw when the API fails, so a failure is never cached: the next request tries again.
 * The exported getters catch it and render the section with empty data instead of failing the page.
 */

/** Unwraps an openapi-fetch result; an error status throws (openapi-fetch itself only throws on network errors). */
async function ok<T>(call: Promise<{ data?: T; response: Response }>): Promise<T> {
  const { data, response } = await call;
  if (!response.ok || data === undefined) throw new Error(`API ${response.status} ${response.url}`);
  return data;
}

async function orFallback<T>(read: Promise<T>, fallback: T): Promise<T> {
  try {
    return await read;
  } catch (error) {
    console.error("[content]", error instanceof Error ? error.message : error);
    return fallback;
  }
}

async function readSettings(locale: Locale): Promise<Settings> {
  "use cache";
  cacheTag("settings");
  cacheLife("hours");
  return ok(api.GET("/api/v1/settings", { params: { query: { locale } } }) as Promise<{ data?: Settings; response: Response }>);
}

async function readSkills(locale: Locale): Promise<SkillGroup[]> {
  "use cache";
  cacheTag("skills");
  cacheLife("hours");
  return ok(api.GET("/api/v1/skills", { params: { query: { locale } } }));
}

async function readTools(): Promise<Tool[]> {
  "use cache";
  cacheTag("tools");
  cacheLife("hours");
  return ok(api.GET("/api/v1/tools"));
}

async function readTimeline(locale: Locale): Promise<TimelineEntry[]> {
  "use cache";
  cacheTag("timeline");
  cacheLife("hours");
  return ok(api.GET("/api/v1/timeline", { params: { query: { locale } } }));
}

async function readCategories(locale: Locale): Promise<Category[]> {
  "use cache";
  cacheTag("categories");
  cacheLife("hours");
  return ok(api.GET("/api/v1/categories", { params: { query: { locale } } }));
}

/** First page of 24 published projects (featured first). */
async function readProjects(locale: Locale): Promise<ProjectCard[]> {
  "use cache";
  cacheTag("projects");
  cacheLife("hours");
  const page = await ok(api.GET("/api/v1/projects", { params: { query: { locale, page: 1, pageSize: 24 } } }));
  return page.items ?? [];
}

async function readTestimonials(): Promise<Testimonial[]> {
  "use cache";
  cacheTag("testimonials");
  cacheLife("hours");
  return ok(api.GET("/api/v1/testimonials"));
}

export const getSettings = (locale: Locale) => orFallback(readSettings(locale), {} as Settings);
export const getSkills = (locale: Locale) => orFallback(readSkills(locale), [] as SkillGroup[]);
export const getTools = () => orFallback(readTools(), [] as Tool[]);
export const getTimeline = (locale: Locale) => orFallback(readTimeline(locale), [] as TimelineEntry[]);
export const getCategories = (locale: Locale) => orFallback(readCategories(locale), [] as Category[]);
export const getProjects = (locale: Locale) => orFallback(readProjects(locale), [] as ProjectCard[]);
/** Approved reviews for the review wall. */
export const getTestimonials = () => orFallback(readTestimonials(), [] as Testimonial[]);

/** Typed reads from the settings bag (values are JSON). */
export const setting = {
  text: (s: Settings, key: string, fallback = ""): string => (typeof s[key] === "string" ? (s[key] as string) : fallback),
  list: (s: Settings, key: string): string[] => (Array.isArray(s[key]) ? (s[key] as unknown[]).filter((x): x is string => typeof x === "string") : []),
  object: <T extends object>(s: Settings, key: string): Partial<T> =>
    s[key] && typeof s[key] === "object" && !Array.isArray(s[key]) ? (s[key] as Partial<T>) : {},
};
