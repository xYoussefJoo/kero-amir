import { Suspense } from "react";
import { getOverview } from "@/lib/server/admin";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AdminNav, AdminNavLinks, type AdminNavItem } from "@/components/admin/AdminNav";
import { SignOutButton } from "@/components/admin/SignOutButton";

const NAV: AdminNavItem[] = [
  { href: "/admin", label: "Overview", icon: "overview" },
  { href: "/admin/inbox", label: "Inbox", icon: "inbox" },
  { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
  { href: "/admin/projects", label: "Projects", icon: "projects" },
  { href: "/admin/content", label: "Content", icon: "content", soon: true },
  { href: "/admin/account", label: "Account", icon: "account", soon: true },
];

/** Same nav, with live counts on Inbox (new messages) and Reviews (waiting for approval). */
async function NavWithBadges() {
  const { inbox, reviews } = await getOverview();
  const badges: Record<string, number> = { "/admin/inbox": Number(inbox.new), "/admin/reviews": Number(reviews.pending) };
  return <AdminNav items={NAV.map((item) => ({ ...item, badge: badges[item.href] }))} soonLabel="Soon" />;
}

/** The dashboard shell: sidebar (top bar on phones) + content. Sign-in lives outside this group. */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="flex items-center gap-3 px-2">
          <Logo size={34} priority />
          <div className="leading-tight">
            <p className="font-display text-base font-semibold">Kero Amir</p>
            <p className="font-mono text-[0.65rem] tracking-[0.2em] text-muted">STUDIO ADMIN</p>
          </div>
        </div>
        <nav aria-label="Dashboard" className="admin-sidebar__nav">
          <Suspense fallback={<AdminNavLinks items={NAV} soonLabel="Soon" />}>
            <NavWithBadges />
          </Suspense>
        </nav>
        <div className="admin-sidebar__foot">
          <a href="/" target="_blank" rel="noopener noreferrer" className="admin-nav__link">
            <svg viewBox="0 0 24 24" aria-hidden className="admin-nav__icon"><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></svg>
            <span>View site</span>
          </a>
          <div className="flex items-center justify-between gap-2 px-2">
            <ThemeToggle toLight="Switch to light theme" toDark="Switch to dark theme" />
            <SignOutButton />
          </div>
        </div>
      </aside>
      <main id="main" className="admin-main">{children}</main>
    </div>
  );
}
