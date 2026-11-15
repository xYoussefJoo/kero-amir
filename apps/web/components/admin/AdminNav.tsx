"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** 24×24 stroke icons, drawn inline (no icon library in the bundle). */
const ICONS = {
  overview: "M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z",
  inbox: "M4 13h4l2 3h4l2-3h4M5 5h14l1 8v6H4v-6l1-8Z",
  reviews: "M12 4l2.4 5 5.6.6-4.2 3.8 1.2 5.6L12 16.3 7 19l1.2-5.6L4 9.6 9.6 9 12 4Z",
  projects: "M4 7h16v12H4V7Zm4-3h8v3H8V4Z",
  content: "M5 4h10l4 4v12H5V4Zm9 0v5h5M8 13h8M8 17h5",
  account: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
} as const;

export type AdminNavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number; soon?: boolean };

/** Highlights the current page. Client-only because it reads the URL. */
export function AdminNav(props: { items: AdminNavItem[]; soonLabel: string }) {
  return <AdminNavLinks {...props} pathname={usePathname()} />;
}

/** The nav markup; with no pathname nothing is highlighted (the static fallback while counts load). */
export function AdminNavLinks({ items, soonLabel, pathname = "" }: { items: AdminNavItem[]; soonLabel: string; pathname?: string }) {
  return (
    <ul className="admin-nav">
      {items.map((item) => {
        const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const icon = (
          <svg viewBox="0 0 24 24" aria-hidden className="admin-nav__icon">
            <path d={ICONS[item.icon]} />
          </svg>
        );
        return (
          <li key={item.href}>
            {item.soon ? (
              <span className="admin-nav__link" aria-disabled="true">
                {icon}
                <span className="flex-1">{item.label}</span>
                <span className="admin-nav__soon">{soonLabel}</span>
              </span>
            ) : (
              <Link href={item.href} className="admin-nav__link" aria-current={active ? "page" : undefined}>
                {icon}
                <span className="flex-1">{item.label}</span>
                {!!item.badge && <span className="admin-nav__badge">{item.badge}</span>}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
