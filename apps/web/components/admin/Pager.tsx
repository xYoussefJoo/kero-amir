import Link from "next/link";

/** Previous / next links that keep the current filter. Hidden when everything fits on one page. */
export function Pager({ base, status, page, pageSize, total }: {
  base: string; status: string | undefined; page: number; pageSize: number; total: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages === 1) return null;
  const href = (p: number) => `${base}?${new URLSearchParams({ ...(status ? { status } : {}), page: String(p) })}`;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-4 text-sm">
      {page > 1 ? <Link href={href(page - 1)} className="admin-btn">← Newer</Link> : <span />}
      <span className="text-muted">Page {page} of {pages}</span>
      {page < pages ? <Link href={href(page + 1)} className="admin-btn">Older →</Link> : <span />}
    </nav>
  );
}
