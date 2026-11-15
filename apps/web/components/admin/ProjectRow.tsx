"use client";

import Link from "next/link";
import type { components } from "@/lib/api/schema";
import { useAdminAction } from "./useAdminAction";

type Project = components["schemas"]["ProjectAdminDto"];

/** One project in the admin list: status, order on the site, and its actions. */
export function ProjectRow({ project, title, tags, order, index }: {
  project: Project; title: string; tags: string[]; order: string[]; index: number;
}) {
  const { run, pending, error } = useAdminAction();
  const published = project.status === "Published";

  const move = (by: -1 | 1) => {
    const ids = [...order];
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    run("projects/order", "PUT", { ids });
  };
  const remove = () => {
    if (confirm(`Delete “${title}”? This can't be undone.`)) run(`projects/${project.id}`, "DELETE");
  };

  return (
    <li className="admin-item admin-project" aria-busy={pending || undefined}>
      <span aria-hidden className="admin-project__swatch" style={{ background: project.accentColor ?? "var(--primary)" }}>
        {title.slice(0, 2)}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/projects/${project.id}`} className="font-display text-lg font-semibold hover:text-primary">{title}</Link>
          {project.isFeatured && <span className="admin-chip admin-chip--pending">Featured</span>}
          <span className={`admin-chip ${published ? "admin-chip--approved" : "admin-chip--quiet"}`}>{published ? "Live" : "Draft"}</span>
        </p>
        <p className="truncate text-sm text-muted">
          {[String(project.year), ...tags].join(" · ")} <span className="font-mono text-xs">/{project.slug}</span>
        </p>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex">
          <button type="button" aria-label="Move up" disabled={pending || index === 0} onClick={() => move(-1)} className="admin-icon-btn">↑</button>
          <button type="button" aria-label="Move down" disabled={pending || index === order.length - 1} onClick={() => move(1)} className="admin-icon-btn">↓</button>
        </div>
        <button type="button" disabled={pending} onClick={() => run(`projects/${project.id}/status`, "PUT", { status: published ? "Draft" : "Published" })}
          className={`admin-btn ${published ? "" : "admin-btn--primary"}`}>{published ? "Unpublish" : "Publish"}</button>
        <Link href={`/admin/projects/${project.id}`} className="admin-btn">Edit</Link>
        <button type="button" disabled={pending} onClick={remove} className="admin-btn admin-btn--danger">Delete</button>
      </div>
    </li>
  );
}
