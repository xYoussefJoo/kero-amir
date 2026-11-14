import type { Metadata } from "next";
import { Suspense } from "react";
import { getMessages, PAGE_SIZE, type InboxStatus } from "@/lib/server/admin";
import { listParams } from "@/lib/admin-params";
import { ago } from "@/lib/time";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { Pager } from "@/components/admin/Pager";
import { MessageItem } from "@/components/admin/MessageItem";
import { ListSkeleton } from "@/components/admin/ListSkeleton";

export const metadata: Metadata = { title: "Inbox" };

const STATUSES = ["New", "Read", "Replied", "Archived"] as const satisfies readonly InboxStatus[];
const EMPTY: Record<string, string> = {
  all: "No messages yet. Enquiries from the contact form land here.",
  New: "No new messages. You're all caught up.",
  Read: "Nothing waiting for a reply.",
  Replied: "No replied messages yet.",
  Archived: "The archive is empty.",
};

export default function InboxPage({ searchParams }: PageProps<"/admin/inbox">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="type-label">02 // Inbox</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Messages</h1>
        <p className="text-muted">Project enquiries from the contact form. Open one to read it; replying opens your email.</p>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <Inbox query={searchParams} />
      </Suspense>
    </div>
  );
}

async function Inbox({ query }: { query: PageProps<"/admin/inbox">["searchParams"] }) {
  const { status, page } = listParams(await query, STATUSES);
  const data = await getMessages(status, page);
  // eslint-disable-next-line react-hooks/purity -- request-time render (cookies), never cached
  const now = Date.now();

  return (
    <>
      <StatusTabs base="/admin/inbox" active={status}
        tabs={[{ value: undefined, label: "All" }, ...STATUSES.map((s) => ({ value: s, label: s }))]} />
      {data.items.length === 0 ? (
        <p className="admin-empty">{EMPTY[status ?? "all"]}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((m) => <MessageItem key={m.id} message={m} when={ago(m.createdAt, now)} />)}
        </ul>
      )}
      <Pager base="/admin/inbox" status={status} page={page} pageSize={PAGE_SIZE} total={data.totalCount} />
    </>
  );
}
