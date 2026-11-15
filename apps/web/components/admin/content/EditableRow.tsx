"use client";

import { useState } from "react";
import { useAdminAction } from "../useAdminAction";

/**
 * A content item: a summary line that opens into its edit form. `form` gets a `close` callback for after saving.
 * Optional reordering (`order` = all ids in their current order) and delete go straight through the BFF.
 */
export function EditableRow({ title, meta, swatch, resource, id, order, index, deleteLabel, form }: {
  title: string; meta?: string; swatch?: string; resource: string; id: string;
  order?: string[]; index?: number; deleteLabel?: string; form: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useAdminAction();

  const move = (by: -1 | 1) => {
    if (!order || index === undefined) return;
    const ids = [...order];
    [ids[index], ids[index + by]] = [ids[index + by], ids[index]];
    run(`${resource}/order`, "PUT", { ids });
  };
  const remove = () => {
    if (confirm(deleteLabel ?? `Delete “${title}”?`)) run(`${resource}/${id}`, "DELETE");
  };

  return (
    <li className="admin-item" aria-busy={pending || undefined}>
      <div className="admin-project">
        {swatch && <span aria-hidden className="h-6 w-6 flex-none rounded-full" style={{ background: swatch }} />}
        <div className="min-w-0 flex-1">
          <p className="font-display font-semibold">{title}</p>
          {meta && <p className="truncate text-sm text-muted">{meta}</p>}
          {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {order && index !== undefined && (
            <div className="flex">
              <button type="button" aria-label="Move up" disabled={pending || index === 0} onClick={() => move(-1)} className="admin-icon-btn">↑</button>
              <button type="button" aria-label="Move down" disabled={pending || index === order.length - 1} onClick={() => move(1)} className="admin-icon-btn">↓</button>
            </div>
          )}
          <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="admin-btn">{open ? "Close" : "Edit"}</button>
          <button type="button" disabled={pending} onClick={remove} className="admin-btn admin-btn--danger">Delete</button>
        </div>
      </div>
      {open && <div className="admin-item__body">{form(() => setOpen(false))}</div>}
    </li>
  );
}

/** "+ Add …" that opens an empty form under the list. */
export function AddItem({ label, form }: { label: string; form: (close: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return open ? (
    <div className="admin-panel">{form(() => setOpen(false))}</div>
  ) : (
    <button type="button" onClick={() => setOpen(true)} className="admin-btn admin-btn--primary self-start">+ {label}</button>
  );
}
