import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCategoriesAdmin, getProjectsAdmin } from "@/lib/server/admin";
import { ProjectRow } from "@/components/admin/ProjectRow";
import { ListSkeleton } from "@/components/admin/ListSkeleton";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <p className="type-label">04 // Projects</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Projects</h1>
          <p className="text-muted">New projects start as drafts. The order here is the order on the site.</p>
        </div>
        <Link href="/admin/projects/new" className="admin-btn admin-btn--primary">+ New project</Link>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <ProjectList />
      </Suspense>
    </div>
  );
}

async function ProjectList() {
  const [projects, categories] = await Promise.all([getProjectsAdmin(), getCategoriesAdmin()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.translations.find((t) => t.locale === "en")?.name ?? c.slug]));
  const order = projects.map((p) => p.id);

  if (projects.length === 0) {
    return <p className="admin-empty">No projects yet. Add the first one with “New project”.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {projects.map((p, i) => (
        <ProjectRow key={p.id} project={p} index={i} order={order}
          title={p.translations.find((t) => t.locale === "en")?.title ?? p.slug}
          tags={p.categoryIds.map((id) => categoryName.get(id) ?? "").filter(Boolean)} />
      ))}
    </ul>
  );
}
