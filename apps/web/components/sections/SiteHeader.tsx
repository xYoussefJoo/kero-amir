import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Logo } from "@/components/ui/Logo";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SmartNav } from "@/components/nav/SmartNav";

const SECTIONS = ["about", "toolkit", "work", "journey", "reviews", "contact"] as const;

export function SiteHeader() {
  const t = useTranslations("Header");
  const locale = useLocale() as Locale;

  return (
    // Sticky + smart (SmartNav): hides on scroll down, returns on scroll up, highlights the current section.
    // The logo slot is where the hero K docks on scroll (PuzzleLogo3D).
    <SmartNav menuLabel={t("menu")} closeLabel={t("closeMenu")}>
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}`} className="rounded-sm">
            <span data-logo-dock className="logo-dock block">
              <Logo size={40} priority />
            </span>
          </Link>
          {/* Availability comes from CMS settings with the admin (Phase 7). */}
          <span className="hidden items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent xl:inline-flex">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-on-accent" />
            {t("available")}
          </span>
        </div>

        <nav id="site-menu" aria-label={t("navLabel")} className="smart-nav__menu">
          <ul className="smart-nav__links">
            {SECTIONS.map((id, i) => (
              <li key={id} style={{ "--i": i } as React.CSSProperties}>
                <a href={`#${id}`} data-section={id} className="smart-nav__link">
                  {t(`nav.${id}`)}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-4 pe-12 lg:pe-0">
          <LocaleSwitcher locale={locale} label={`${t("language")}: ${t("switchTo")}`} />
          <ThemeToggle toLight={t("themeToLight")} toDark={t("themeToDark")} />
        </div>
      </div>
    </SmartNav>
  );
}
