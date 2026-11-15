import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { projectOptions } from "@/lib/admin-options";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { ListSkeleton } from "@/components/admin/ListSkeleton";

export const metadata: Metadata = { title: "New project" };

export default function NewProjectPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Link href="/admin/projects" className="text-sm text-muted hover:text-primary">← Projects</Link>
        <h1 className="font-display text-3xl font-semibold tracking-tight">New project</h1>
      </header>
      <Suspense fallback={<ListSkeleton rows={3} />}>
        <Form />
      </Suspense>
    </div>
  );
}

async function Form() {
  return <ProjectForm {...await projectOptions()} />;
}
