"use client";

import type { components } from "@/lib/api/schema";
import { AddItem, EditableRow } from "./EditableRow";
import { FormFooter, Text, val } from "./fields";
import { useContentSave } from "./useContentSave";

type Tool = components["schemas"]["ToolAdminDto"];

export function ToolsEditor({ tools }: { tools: Tool[] }) {
  const order = tools.map((t) => t.id);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">Software Kero works with. Tools marked “orbit” circle the logo in the Toolkit section.</p>
      <ul className="flex flex-col gap-3">
        {tools.map((t, i) => (
          <EditableRow key={t.id} id={t.id} resource="tools" order={order} index={i} title={t.name} swatch={t.color ?? undefined}
            meta={[t.showInOrbit ? "In the orbit" : null, `/${t.slug}`].filter(Boolean).join(" · ")}
            form={(close) => <ToolForm tool={t} close={close} />} />
        ))}
      </ul>
      <AddItem label="Add tool" form={(close) => <ToolForm close={close} />} />
    </div>
  );
}

function ToolForm({ tool, close }: { tool?: Tool; close: () => void }) {
  const { save, busy, messages } = useContentSave("tools", tool?.id, close);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    save({ slug: val(f, "slug"), name: val(f, "name"), color: val(f, "color").toUpperCase() || null, showInOrbit: f.get("orbit") === "on" });
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="admin-form-grid">
        <Text label="Name" name="name" value={tool?.name} required />
        <Text label="Web address" name="slug" value={tool?.slug} required hint="e.g. after-effects" />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Colour
          <input type="color" name="color" defaultValue={tool?.color ?? "#2546EB"} className="h-11 w-14 cursor-pointer rounded-lg border border-muted/40 bg-transparent" />
        </label>
        <label className="flex items-center gap-3 self-end pb-3 text-sm font-medium">
          <input type="checkbox" name="orbit" defaultChecked={tool?.showInOrbit ?? true} className="h-5 w-5 accent-[var(--primary)]" />
          Show in the logo orbit
        </label>
      </div>
      <FormFooter busy={busy} messages={messages} onCancel={close} />
    </form>
  );
}
