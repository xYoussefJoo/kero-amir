import type { Metadata } from "next";
import { Suspense } from "react";
import { getReviews, PAGE_SIZE, type ModerationStatus } from "@/lib/server/admin";
import { listParams } from "@/lib/admin-params";
import { ago } from "@/lib/time";
import { StatusTabs } from "@/components/admin/StatusTabs";
import { Pager } from "@/components/admin/Pager";
import { ReviewItem } from "@/components/admin/ReviewItem";
import { ListSkeleton } from "@/components/admin/ListSkeleton";

export const metadata: Metadata = { title: "Reviews" };

const STATUSES = ["Pending", "Approved", "Rejected"] as const satisfies readonly ModerationStatus[];
const EMPTY: Record<string, string> = {
  all: "No reviews yet. They arrive from the review form on the site.",
  Pending: "All caught up. New reviews wait here until you approve them.",
  Approved: "No reviews on the site yet. Approve one to publish it.",
  Rejected: "Nothing rejected.",
};
const regions = new Intl.DisplayNames(["en"], { type: "region" });

export default function ReviewsPage({ searchParams }: PageProps<"/admin/reviews">) {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="type-label">03 // Reviews</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Reviews</h1>
        <p className="text-muted">Only approved reviews appear on the site. Featured ones are shown first.</p>
      </header>
      <Suspense fallback={<ListSkeleton />}>
        <Reviews query={searchParams} />
      </Suspense>
    </div>
  );
}

async function Reviews({ query }: { query: PageProps<"/admin/reviews">["searchParams"] }) {
  const params = listParams(await query, STATUSES);
  // The queue opens on what needs a decision; "All" is an explicit choice.
  const status = params.status ?? ((await query).status === "all" ? undefined : "Pending");
  const data = await getReviews(status, params.page);
  // eslint-disable-next-line react-hooks/purity -- request-time render (cookies), never cached
  const now = Date.now();

  return (
    <>
      <StatusTabs base="/admin/reviews" active={status ?? "all"}
        tabs={[...STATUSES.map((s) => ({ value: s, label: s === "Pending" ? "Waiting" : s })), { value: "all", label: "All" }]} />
      {data.items.length === 0 ? (
        <p className="admin-empty">{EMPTY[status ?? "all"]}</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.items.map((r) => (
            <ReviewItem key={r.id} review={r} when={ago(r.createdAt, now)}
              country={r.countryCode ? regions.of(r.countryCode) : undefined} />
          ))}
        </ul>
      )}
      <Pager base="/admin/reviews" status={status ?? "all"} page={params.page} pageSize={PAGE_SIZE} total={data.totalCount} />
    </>
  );
}
