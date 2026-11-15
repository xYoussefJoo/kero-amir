import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { api, authHeaders } from "@/lib/api/client";
import type { components } from "@/lib/api/schema";
import { Cookies } from "./session";

export type DashboardOverview = components["schemas"]["DashboardOverview"];
export type Me = components["schemas"]["MeResponse"];

/**
 * Reads for admin Server Components. The proxy has already refreshed an expired token, so a missing token or a 401
 * here means the session is really gone: back to sign-in. Never cached: admin data must be current.
 */
async function token(): Promise<string> {
  const value = (await cookies()).get(Cookies.access)?.value;
  if (!value) redirect("/admin/login");
  return value;
}

async function read<T>(call: Promise<{ data?: T; response: Response }>): Promise<T> {
  const { data, response } = await call;
  if (response.status === 401) redirect("/admin/login");
  if (!response.ok || data === undefined) throw new Error(`The API answered ${response.status}.`);
  return data;
}

/** cache(): the layout (nav badges) and the page share one call per request. */
export const getMe = cache(async (): Promise<Me> => {
  const headers = authHeaders(await token());
  return read(api.GET("/api/v1/admin/account/me", { headers }));
});

export const getOverview = cache(async (): Promise<DashboardOverview> => {
  const headers = authHeaders(await token());
  return read(api.GET("/api/v1/admin/overview", { headers }));
});

type Schemas = components["schemas"];
export type InboxStatus = Schemas["InboxStatus"];
export type ModerationStatus = Schemas["ModerationStatus"];
export type ContactMessage = Schemas["ContactMessageDto"];
export type ReviewAdmin = Schemas["TestimonialAdminDto"];
export type Paged<T> = { items: T[]; page: number; pageSize: number; totalCount: number };

export const PAGE_SIZE = 20;

/** Inbox page; no status = everything. Newest first. */
export async function getMessages(status: InboxStatus | undefined, page: number): Promise<Paged<ContactMessage>> {
  const headers = authHeaders(await token());
  const data = await read(api.GET("/api/v1/admin/messages", { headers, params: { query: { status, page, pageSize: PAGE_SIZE } } }));
  return { ...data, page: Number(data.page), pageSize: Number(data.pageSize), totalCount: Number(data.totalCount) };
}

/** Moderation queue page; no status = everything. Newest first. */
export async function getReviews(status: ModerationStatus | undefined, page: number): Promise<Paged<ReviewAdmin>> {
  const headers = authHeaders(await token());
  const data = await read(api.GET("/api/v1/admin/testimonials", { headers, params: { query: { status, page, pageSize: PAGE_SIZE } } }));
  return { ...data, page: Number(data.page), pageSize: Number(data.pageSize), totalCount: Number(data.totalCount) };
}

export type ProjectAdmin = Schemas["ProjectAdminDto"];
export type CategoryAdmin = Schemas["CategoryAdminDto"];
export type ToolAdmin = Schemas["ToolAdminDto"];

/** A portfolio stays small (tens of projects), so the admin loads the whole list in one page. */
const ALL = { Page: 1, PageSize: 100 };

export async function getProjectsAdmin(): Promise<ProjectAdmin[]> {
  const headers = authHeaders(await token());
  return (await read(api.GET("/api/v1/admin/projects", { headers, params: { query: ALL } }))).items;
}

/** One project for the edit form; null when it doesn't exist (the page shows 404). */
export async function getProjectAdmin(id: string): Promise<ProjectAdmin | null> {
  const headers = authHeaders(await token());
  const { data, response } = await api.GET("/api/v1/admin/projects/{id}", { headers, params: { path: { id } } });
  if (response.status === 404 || response.status === 400) return null;
  return read(Promise.resolve({ data, response }));
}

export const getCategoriesAdmin = cache(async (): Promise<CategoryAdmin[]> => {
  const headers = authHeaders(await token());
  return (await read(api.GET("/api/v1/admin/categories", { headers, params: { query: ALL } }))).items;
});

export const getToolsAdmin = cache(async (): Promise<ToolAdmin[]> => {
  const headers = authHeaders(await token());
  return (await read(api.GET("/api/v1/admin/tools", { headers, params: { query: ALL } }))).items;
});

export type SkillGroupAdmin = Schemas["SkillGroupAdminDto"];
export type SkillAdmin = Schemas["SkillAdminDto"];
export type TimelineAdmin = Schemas["TimelineEntryAdminDto"];
export type SettingAdmin = Schemas["SettingAdminDto"];

export async function getSkillGroupsAdmin(): Promise<SkillGroupAdmin[]> {
  const headers = authHeaders(await token());
  return [...(await read(api.GET("/api/v1/admin/skill-groups", { headers })))];
}

export async function getSkillsAdmin(): Promise<SkillAdmin[]> {
  const headers = authHeaders(await token());
  return (await read(api.GET("/api/v1/admin/skills", { headers, params: { query: ALL } }))).items;
}

export async function getTimelineAdmin(): Promise<TimelineAdmin[]> {
  const headers = authHeaders(await token());
  return (await read(api.GET("/api/v1/admin/timeline", { headers, params: { query: ALL } }))).items;
}

export async function getSettingsAdmin(): Promise<SettingAdmin[]> {
  const headers = authHeaders(await token());
  return [...(await read(api.GET("/api/v1/admin/settings", { headers })))];
}
