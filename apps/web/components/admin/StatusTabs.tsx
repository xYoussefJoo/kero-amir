import Link from "next/link";

/** Filter tabs as plain links (?status=...), so every view has its own URL and works without JavaScript. */
export function StatusTabs({ base, tabs, active }: {
  base: string; tabs: { value: string | undefined; label: string }[]; active: string | undefined;
}) {
  return (
    <nav aria-label="Filter" className="admin-tabs">
      {tabs.map((tab) => (
        <Link key={tab.label} href={tab.value ? `${base}?status=${tab.value}` : base}
          aria-current={tab.value === active ? "page" : undefined} className="admin-tab">
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
