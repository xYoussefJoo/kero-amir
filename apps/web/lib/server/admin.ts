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
