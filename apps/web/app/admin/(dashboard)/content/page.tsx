import type { Metadata } from "next";
import { Suspense } from "react";
import {
  getCategoriesAdmin, getSettingsAdmin, getSkillGroupsAdmin, getSkillsAdmin, getTimelineAdmin, getToolsAdmin,
} from "@/lib/server/admin";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { ListSkeleton } from "@/components/admin/ListSkeleton";
import { SettingsEditor } from "@/components/admin/content/SettingsEditor";
import { CategoriesEditor } from "@/components/admin/content/CategoriesEditor";
import { ToolsEditor } from "@/components/admin/content/ToolsEditor";
import { SkillsEditor } from "@/components/admin/content/SkillsEditor";
import { TimelineEditor } from "@/components/admin/content/TimelineEditor";

export const metadata: Metadata = { title: "Content" };

const TABS = [
  { value: "texts", label: "Site texts" },
  { value: "skills", label: "Skills" },
  { value: "tools", label: "Tools" },
  { value: "timeline", label: "Journey" },
  { value: "categories", label: "Categories" },
] as const;
type Tab = (typeof TABS)[number]["value"];

export default function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="type-label">05 // Content</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Content</h1>
        <p className="text-muted">Everything on the site that isn&apos;t a project or a review. Changes show on the next visit.</p>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <Content query={searchParams} />
      </Suspense>
    </div>
  );
}

async function Content({ query }: { query: PageProps<"/admin/content">["searchParams"] }) {
  const requested = (await query).status;
  const tab: Tab = TABS.find((t) => t.value === requested)?.value ?? "texts";
  // StatusTabs links with ?status=; here it names the tab.
  return (
    <>
      <StatusTabs base="/admin/content" active={tab} tabs={TABS.map((t) => ({ value: t.value, label: t.label }))} />
      <TabBody tab={tab} />
    </>
  );
}

async function TabBody({ tab }: { tab: Tab }) {
  switch (tab) {
    case "texts":
      return <SettingsEditor settings={await getSettingsAdmin()} />;
    case "categories":
      return <CategoriesEditor categories={await getCategoriesAdmin()} />;
    case "tools":
      return <ToolsEditor tools={await getToolsAdmin()} />;
    case "timeline":
      return <TimelineEditor entries={await getTimelineAdmin()} />;
    case "skills": {
      const [groups, skills, tools] = await Promise.all([getSkillGroupsAdmin(), getSkillsAdmin(), getToolsAdmin()]);
      return <SkillsEditor groups={groups} skills={skills} tools={tools.map((t) => ({ id: t.id, name: t.name }))} />;
    }
  }
}
