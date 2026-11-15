import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getProjectAdmin } from "@/lib/server/admin";
import { projectOptions } from "@/lib/admin-options";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ListSkeleton } from "@/components/admin/ListSkeleton";

export const metadata: Metadata = { title: "Edit project" };

export default function EditProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/admin/projects" className="text-sm text-muted hover:text-primary">← Projects</Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Edit project</h1>
      </header>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Form params={params} />
      </Suspense>
    </div>
  );
}

async function Form({ params }: { params: PageProps<"/admin/projects/[id]">["params"] }) {
  const { id } = await params;
  const [project, options] = await Promise.all([getProjectAdmin(id), projectOptions()]);
  if (!project) notFound();
  return <ProjectForm project={project} {...options} />;
}
