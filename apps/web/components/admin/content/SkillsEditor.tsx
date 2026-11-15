"use client";

import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { AddItem, EditableRow } from "./EditableRow";
import { FormFooter, nameIn, Text, translations, val } from "./fields";
import { useContentSave } from "./useContentSave";

type Group = components["schemas"]["SkillGroupAdminDto"];
type Skill = components["schemas"]["SkillAdminDto"];
type Tool = { id: string; name: string };

/** Skill groups (the cards in the Toolkit section) and the skills inside each, with their level bars. */
export function SkillsEditor({ groups, skills, tools }: { groups: Group[]; skills: Skill[]; tools: Tool[] }) {
  const order = groups.map((g) => g.id);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-muted">Each group is a card in the Toolkit section; skills show as level bars inside it.</p>
      {groups.map((g, i) => {
        const inGroup = skills.filter((s) => s.skillGroupId === g.id).sort((a, b) => Number(a.sortOrder) - Number(b.sortOrder));
        const skillOrder = inGroup.map((s) => s.id);
        return (
          <section key={g.id} className="flex flex-col gap-3">
            <ul>
              <EditableRow id={g.id} resource="skill-groups" order={order} index={i} title={nameIn(g.translations, "en")}
                meta={`${Number(g.skillCount)} skills${nameIn(g.translations, "de") ? ` · ${nameIn(g.translations, "de")}` : ""}`}
                deleteLabel={`Delete the group “${nameIn(g.translations, "en")}” and all its skills?`}
                form={(close) => <GroupForm group={g} close={close} />} />
            </ul>
            <ul className="ms-4 flex flex-col gap-2 border-s-2 border-muted/20 ps-4">
              {inGroup.map((s, j) => (
                <EditableRow key={s.id} id={s.id} resource="skills" order={skillOrder} index={j} title={nameIn(s.translations, "en")}
                  meta={`Level ${Number(s.level)}%${s.toolId ? ` · ${tools.find((t) => t.id === s.toolId)?.name ?? ""}` : ""}`}
                  form={(close) => <SkillForm skill={s} groups={groups} tools={tools} groupId={g.id} close={close} />} />
              ))}
              <li><AddItem label="Add skill" form={(close) => <SkillForm groups={groups} tools={tools} groupId={g.id} close={close} />} /></li>
            </ul>
          </section>
        );
      })}
      <AddItem label="Add skill group" form={(close) => <GroupForm close={close} />} />
    </div>
  );
}

function GroupForm({ group, close }: { group?: Group; close: () => void }) {
  const { save, busy, messages } = useContentSave("skill-groups", group?.id, close);
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const de = val(f, "de");
    save({ translations: translations({ name: val(f, "en") }, de ? { name: de } : null) });
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="admin-form-grid">
        <Text label="Group name (English)" name="en" value={group && nameIn(group.translations, "en")} required />
        <Text label="Group name (German)" name="de" value={group && nameIn(group.translations, "de")} />
      </div>
      <FormFooter busy={busy} messages={messages} onCancel={close} />
    </form>
  );
}

function SkillForm({ skill, groups, tools, groupId, close }: {
  skill?: Skill; groups: Group[]; tools: Tool[]; groupId: string; close: () => void;
}) {
  const { save, busy, messages } = useContentSave("skills", skill?.id, close);
  const [level, setLevel] = useState(Number(skill?.level ?? 80));
  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const de = val(f, "de");
    save({
      skillGroupId: val(f, "group"), toolId: val(f, "tool") || null, level,
      translations: translations({ name: val(f, "en") }, de ? { name: de } : null),
    });
  };
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="admin-form-grid">
        <Text label="Skill (English)" name="en" value={skill && nameIn(skill.translations, "en")} required />
        <Text label="Skill (German)" name="de" value={skill && nameIn(skill.translations, "de")} />
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Level: {level}%
          <input type="range" min={0} max={100} step={5} value={level} onChange={(e) => setLevel(Number(e.target.value))} className="accent-[var(--primary)]" />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Tool (optional)
          <select name="tool" defaultValue={skill?.toolId ?? ""} className="form-input">
            <option value="">None</option>
            {tools.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Group
          <select name="group" defaultValue={skill?.skillGroupId ?? groupId} className="form-input">
            {groups.map((g) => <option key={g.id} value={g.id}>{nameIn(g.translations, "en")}</option>)}
          </select>
        </label>
      </div>
      <FormFooter busy={busy} messages={messages} onCancel={close} />
    </form>
  );
}
