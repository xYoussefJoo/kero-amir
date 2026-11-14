"use client";

import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { useAdminAction } from "./useAdminAction";

type Message = components["schemas"]["ContactMessageDto"];
type Status = components["schemas"]["InboxStatus"];

const BUDGETS: Record<string, string> = {
  "under-1k": "Under $1,000", "1k-3k": "$1,000–3,000", "3k-10k": "$3,000–10,000", "10k-plus": "$10,000+", "not-sure": "Not sure yet",
};

/** One enquiry: a summary row that opens into the full message. Opening a new message marks it read. */
export function MessageItem({ message, when }: { message: Message; when: string }) {
  const [open, setOpen] = useState(false);
  const { run, pending, error } = useAdminAction();
  const setStatus = (status: Status) => run(`messages/${message.id}/status`, "PUT", { status });

  const toggle = () => {
    setOpen(!open);
    if (!open && message.status === "New") setStatus("Read");
  };

  const subject = encodeURIComponent(`Re: your ${message.service ? message.service.replaceAll("-", " ") : "project"} enquiry`);

  return (
    <li className="admin-item" data-status={message.status} aria-busy={pending || undefined}>
      <button type="button" onClick={toggle} aria-expanded={open} className="admin-item__head">
        {message.status === "New" && <span aria-label="New" className="admin-dot" />}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <strong className="font-display">{message.name}</strong>
            {message.company && <span className="text-sm text-muted">{message.company}</span>}
          </span>
          {!open && <span className="block truncate text-sm text-muted">{message.message}</span>}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <time dateTime={message.createdAt} className="text-xs text-muted">{when}</time>
          {message.status !== "New" && <span className="admin-chip admin-chip--quiet">{message.status}</span>}
        </span>
      </button>

      {open && (
        <div className="admin-item__body">
          <dl className="admin-meta">
            <div><dt>Email</dt><dd><a href={`mailto:${message.email}`} className="text-primary underline-offset-4 hover:underline">{message.email}</a></dd></div>
            {message.service && <div><dt>Service</dt><dd>{message.service.replaceAll("-", " ")}</dd></div>}
            {message.budget && <div><dt>Budget</dt><dd>{BUDGETS[message.budget] ?? message.budget}</dd></div>}
            <div><dt>Language</dt><dd>{message.locale === "de" ? "German" : "English"}</dd></div>
          </dl>
          <p className="whitespace-pre-line leading-relaxed">{message.message}</p>
          <div className="flex flex-wrap gap-2">
            <a href={`mailto:${message.email}?subject=${subject}`} onClick={() => message.status !== "Replied" && setStatus("Replied")}
              className="admin-btn admin-btn--primary">Reply by email</a>
            {message.status !== "New" && message.status !== "Archived" && (
              <button type="button" disabled={pending} onClick={() => setStatus("New")} className="admin-btn">Mark as new</button>
            )}
            {message.status === "Archived" ? (
              <button type="button" disabled={pending} onClick={() => setStatus("Read")} className="admin-btn">Restore</button>
            ) : (
              <button type="button" disabled={pending} onClick={() => setStatus("Archived")} className="admin-btn">Archive</button>
            )}
          </div>
          {error && <p role="alert" className="text-sm text-accent">{error}</p>}
        </div>
      )}
    </li>
  );
}
