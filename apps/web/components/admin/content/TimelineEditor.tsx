"use client";

import type { components } from "@/lib/api/schema";
import { AddItem, EditableRow } from "./EditableRow";
import { FormFooter, Text, translations, val } from "./fields";
import { useContentSave } from "./useContentSave";

type Entry = components["schemas"]["TimelineEntryAdminDto"];
const KINDS = ["Work", "Education", "Award", "Milestone"] as const;

const month = (iso: string | null | undefined) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en", { month: "short", year: "numeric" }) : "Present";

/** The Journey section: jobs, studies, awards and milestones, newest first on the site. */
export function TimelineEditor({ entries }: { entries: Entry[] }) {
  const sorted = [...entries].sort((a, b) => b.startDate.localeCompare(a.startDate));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">The Journey section. The site sorts entries by date, newest first.</p>
      <ul className="flex flex-col gap-3">
        {sorted.map((e) => {
          const en = e.translations.find((t) => t.locale === "en");
          return (
            <EditableRow key={e.id} id={e.id} resource="timeline" title={en?.title ?? "(untitled)"}
              meta={[e.kind, `${month(e.startDate)} – ${month(e.endDate)}`, e.organization].filter(Boolean).join(" · ")}
              form={(close) => <EntryForm entry={e} close={close} />} />
          );
        })}
      </ul>
      <AddItem label="Add entry" form={(close) => <EntryForm close={close} />} />
    </div>
  );
}

function EntryForm({ entry, close }: { entry?: Entry; close: () => void }) {
  const { save, busy, messages } = useContentSave("timeline", entry?.id, close);
  const t = (locale: string) => entry?.translations.find((x) => x.locale === locale);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const deTitle = val(f, "deTitle");
    save({
      kind: val(f, "kind"), startDate: val(f, "start"), endDate: val(f, "end") || null,
      organization: val(f, "org") || null, location: val(f, "location") || null,
      translations: translations(
        { title: val(f, "enTitle"), description: val(f, "enDesc") || null },
        deTitle ? { title: deTitle, description: val(f, "deDesc") || null } : null),
    });
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="admin-form-grid">
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Type
          <select name="kind" defaultValue={entry?.kind ?? "Work"} className="form-input">
            {KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <Text label="Organisation" name="org" value={entry?.organization} />
        <Text label="Start" name="start" type="date" value={entry?.startDate} required />
        <Text label="End" name="end" type="date" value={entry?.endDate} hint="Leave empty if it's still going." />
        <Text label="Location" name="location" value={entry?.location} wide />
        <Text label="Title (English)" name="enTitle" value={t("en")?.title} required wide />
        <Text label="Description (English)" name="enDesc" value={t("en")?.description} textarea wide />
        <Text label="Title (German)" name="deTitle" value={t("de")?.title} wide />
        <Text label="Description (German)" name="deDesc" value={t("de")?.description} textarea wide />
      </div>
      <FormFooter busy={busy} messages={messages} onCancel={close} />
    </form>
  );
}
