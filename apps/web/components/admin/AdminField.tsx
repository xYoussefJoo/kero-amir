/** A labelled form field with its error and an optional hint. `wide` spans both columns of `.admin-form-grid`. */
export function AdminField({ label, hint, error, wide, children }: {
  label: string; hint?: string; error?: string; wide?: boolean; children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {hint && !error && <span className="text-xs font-normal text-muted">{hint}</span>}
      {error && <span className="text-xs font-normal text-accent">{error}</span>}
    </label>
  );
}

/** Messages from the API (validation, conflicts) shown above the save button. */
export function FormMessages({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null;
  return (
    <div role="alert" className="admin-alert">
      <ul className="list-disc ps-5">{messages.map((m) => <li key={m}>{m}</li>)}</ul>
    </div>
  );
}
