import { AdminField, FormMessages } from "../AdminField";

/** Read a text field from a submitted form ("" when empty). */
export const val = (form: FormData, name: string) => String(form.get(name) ?? "").trim();

/** English is required by the API; German is sent only when filled (the site falls back to English). */
export function translations<T extends object>(en: T, de: T | null) {
  return [{ locale: "en", ...en }, ...(de ? [{ locale: "de", ...de }] : [])];
}

export const nameIn = (list: { locale: string; name: string }[], locale: string) => list.find((t) => t.locale === locale)?.name ?? "";

export function Text({ label, name, value, hint, wide, required, type = "text", textarea }: {
  label: string; name: string; value?: string | null; hint?: string; wide?: boolean; required?: boolean; type?: string; textarea?: boolean;
}) {
  return (
    <AdminField label={required ? label : `${label} (optional)`} hint={hint} wide={wide}>
      {textarea
        ? <textarea name={name} defaultValue={value ?? ""} rows={3} className="form-input" />
        : <input name={name} type={type} defaultValue={value ?? ""} required={required} className="form-input" />}
    </AdminField>
  );
}

export function FormFooter({ busy, messages, onCancel, label = "Save" }: { busy: boolean; messages: string[]; onCancel: () => void; label?: string }) {
  return (
    <>
      <FormMessages messages={messages} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className="admin-btn admin-btn--primary">{busy ? "Saving…" : label}</button>
        <button type="button" onClick={onCancel} className="admin-btn">Cancel</button>
      </div>
    </>
  );
}
