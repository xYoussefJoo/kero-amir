import type { Metadata } from "next";
import { Suspense } from "react";
import { getMe, getOverview, type DashboardOverview } from "@/lib/server/admin";

export const metadata: Metadata = { title: "Overview" };

const relative = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

/** "3 hours ago", "yesterday", "2 weeks ago". */
function ago(iso: string, now: number): string {
  const seconds = Math.round((Date.parse(iso) - now) / 1000);
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]];
  for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
  return "just now";
}

export default function OverviewPage() {
  return (
    <div className="flex flex-col gap-8">
      <Suspense fallback={<OverviewSkeleton />}>
        <Overview />
      </Suspense>
    </div>
  );
}

async function Overview() {
  const [me, data] = await Promise.all([getMe(), getOverview()]);
  // eslint-disable-next-line react-hooks/purity -- request-time render (cookies), never cached
  const now = Date.now();

  return (
    <>
      <header className="flex flex-col gap-2">
        <p className="type-label">01 // Overview</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Welcome back</h1>
        <p className="text-muted">{me.email}</p>
      </header>

      {!me.twoFactorEnabled && (
        <div role="status" className="admin-alert">
          <strong>Two-factor sign-in is off.</strong> Turn it on before the site goes live (Account, coming in part 5).
        </div>
      )}

      <StatCards data={data} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Latest messages" count={data.inbox.new} countLabel="new">
          {data.latestMessages.length === 0 ? (
            <Empty>No messages yet. Enquiries from the contact form land here.</Empty>
          ) : (
            <ul className="admin-list">
              {data.latestMessages.map((m) => (
                <li key={m.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <strong className="font-display">{m.name}</strong>
                    <time dateTime={m.createdAt} className="shrink-0 text-xs text-muted">{ago(m.createdAt, now)}</time>
                  </div>
                  {m.service && <p className="type-label !text-[0.65rem]">{m.service.replaceAll("-", " ")}</p>}
                  <p className="text-sm text-muted">{m.excerpt}</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Waiting for approval" count={data.reviews.pending} countLabel="pending">
          {data.pendingReviews.length === 0 ? (
            <Empty>All caught up. New reviews wait here until you approve them.</Empty>
          ) : (
            <ul className="admin-list">
              {data.pendingReviews.map((r) => (
                <li key={r.id}>
                  <div className="flex items-baseline justify-between gap-3">
                    <strong className="font-display">{r.authorName}</strong>
                    <time dateTime={r.createdAt} className="shrink-0 text-xs text-muted">{ago(r.createdAt, now)}</time>
                  </div>
                  <p aria-label={`${r.rating} of 5 stars`} className="text-sm tracking-widest text-accent">
                    {"★".repeat(Number(r.rating))}<span className="opacity-25">{"★".repeat(5 - Number(r.rating))}</span>
                  </p>
                  <p className="text-sm text-muted">“{r.excerpt}”</p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </>
  );
}

function StatCards({ data }: { data: DashboardOverview }) {
  const { projects, reviews, inbox, content } = data;
  const contentTotal = [content.categories, content.tools, content.skills, content.timelineEntries].map(Number).reduce((a, b) => a + b, 0);
  const cards = [
    { tone: "blue", label: "Published projects", value: projects.published, note: `${projects.drafts} in draft` },
    { tone: "orange", label: "Reviews to approve", value: reviews.pending, note: `${reviews.approved} live on the site` },
    { tone: "ink", label: "New messages", value: inbox.new, note: `${inbox.total} in the inbox` },
    { tone: "paper", label: "Content pieces", value: contentTotal, note: `${content.skills} skills · ${content.tools} tools · ${content.timelineEntries} milestones` },
  ] as const;

  return (
    <ul className="admin-stats">
      {cards.map((c) => (
        <li key={c.label} className={`admin-stat admin-stat--${c.tone}`}>
          <p className="text-sm font-medium opacity-80">{c.label}</p>
          <p className="font-display text-4xl font-semibold tracking-tight">{Number(c.value)}</p>
          <p className="text-xs opacity-70">{c.note}</p>
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, count, countLabel, children }: { title: string; count: number | string; countLabel: string; children: React.ReactNode }) {
  return (
    <section className="admin-panel">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        <span className="admin-chip">{Number(count)} {countLabel}</span>
      </header>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-muted/40 p-6 text-center text-sm text-muted">{children}</p>;
}

/** Same layout as the real content, so nothing jumps when the data arrives. */
function OverviewSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="flex flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="admin-skel h-3 w-28" />
        <div className="admin-skel h-9 w-64" />
        <div className="admin-skel h-4 w-48" />
      </div>
      <ul className="admin-stats">
        {[0, 1, 2, 3].map((i) => <li key={i} className="admin-skel h-[8.5rem] rounded-2xl" />)}
      </ul>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="admin-skel h-72 rounded-2xl" />
        <div className="admin-skel h-72 rounded-2xl" />
      </div>
    </div>
  );
}
