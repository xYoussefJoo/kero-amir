"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { FormMessages } from "../AdminField";
import { saveAdmin } from "../saveAdmin";

type Setting = components["schemas"]["SettingAdminDto"];

/** Friendly names for the texts the site shows; unknown keys fall back to the key itself. */
const LABELS: Record<string, string> = {
  "hero.eyebrow": "Hero: line above the name",
  "hero.name": "Hero: name",
  "hero.headline": "Hero: headline",
  "hero.subheadline": "Hero: sub-headline",
  heroStats: "About: numbers",
  "about.title": "About: title",
  "about.intro": "About: intro",
  "about.philosophy": "About: philosophy",
  "about.capabilities": "About: capabilities (one per line)",
};
const LANGUAGES: Record<string, string> = { en: "English", de: "German" };
/** Language-neutral values first, then English, then German. */
const localeRank = (locale: string | null) => (locale === null ? 0 : locale === "en" ? 1 : 2);

/** Site texts, grouped by key. Each value is edited in the shape it has: text, a list, or numbers. */
export function SettingsEditor({ settings }: { settings: Setting[] }) {
  const keys = [...new Set(settings.map((s) => s.key))].sort((a, b) => (LABELS[a] ? 0 : 1) - (LABELS[b] ? 0 : 1) || a.localeCompare(b));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-muted">Texts and numbers on the site. Each language saves on its own.</p>
      {keys.map((key) => (
        <section key={key} className="admin-panel">
          <h2 className="font-display text-base font-semibold">{LABELS[key] ?? key}</h2>
          {settings.filter((s) => s.key === key).sort((a, b) => localeRank(a.locale) - localeRank(b.locale)).map((s) => <SettingField key={`${s.key}:${s.locale}`} setting={s} />)}
        </section>
      ))}
    </div>
  );
}

function SettingField({ setting }: { setting: Setting }) {
  const router = useRouter();
  const value = setting.value as unknown;
  const kind = typeof value === "string" ? "text" : Array.isArray(value) ? "list"
    : value && typeof value === "object" && Object.values(value).every((v) => typeof v === "number") ? "numbers" : "json";

  const initial = kind === "text" ? (value as string) : kind === "list" ? (value as string[]).join("\n") : JSON.stringify(value, null, 2);
  const [draft, setDraft] = useState(initial);
  const [numbers, setNumbers] = useState<Record<string, number>>(kind === "numbers" ? (value as Record<string, number>) : {});
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const save = async () => {
    let next: unknown;
    if (kind === "text") next = draft.trim();
    else if (kind === "list") next = draft.split("\n").map((l) => l.trim()).filter(Boolean);
    else if (kind === "numbers") next = numbers;
    else {
      try { next = JSON.parse(draft); } catch { return setMessages(["That isn't valid JSON."]); }
    }
    setBusy(true);
    setMessages([]);
    const result = await saveAdmin(`settings/${encodeURIComponent(setting.key)}`, "PUT", { locale: setting.locale, value: next });
    setBusy(false);
    if (!result.ok) return setMessages(result.messages);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    router.refresh();
  };

  const label = setting.locale ? LANGUAGES[setting.locale] ?? setting.locale : "All languages";
  const long = kind !== "text" || initial.length > 60;

  return (
    <div className="flex flex-col gap-2">
      <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-muted">{label}</span>
      {kind === "numbers" ? (
        <div className="admin-form-grid">
          {Object.entries(numbers).map(([name, n]) => (
            <label key={name} className="flex flex-col gap-1.5 text-sm font-medium capitalize">
              {name}
              <input type="number" value={n} onChange={(e) => setNumbers({ ...numbers, [name]: Number(e.target.value) })} className="form-input" />
            </label>
          ))}
        </div>
      ) : long ? (
        <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={kind === "text" ? 3 : 5}
          className={`form-input ${kind === "json" ? "font-mono text-sm" : ""}`} />
      ) : (
        <input value={draft} onChange={(e) => setDraft(e.target.value)} className="form-input" />
      )}
      <FormMessages messages={messages} />
      <button type="button" onClick={save} disabled={busy} className="admin-btn self-start">{busy ? "Saving…" : saved ? "Saved ✓" : "Save"}</button>
    </div>
  );
}
