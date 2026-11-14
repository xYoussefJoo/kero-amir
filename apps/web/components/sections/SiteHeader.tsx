import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { Logo } from "@/components/ui/Logo";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function SiteHeader() {
  const t = useTranslations("Header");
  const locale = useLocale() as Locale;

  return (
    // Sticky, so the logo slot stays on screen: the hero K flies into it on scroll (PuzzleLogo3D).
    <header className="sticky top-0 z-30 w-full bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href={`/${locale}`} className="rounded-sm">
            <span data-logo-dock className="logo-dock block">
              <Logo size={40} priority />
            </span>
          </Link>
          {/* Availability comes from CMS settings in Phase 2. */}
          <span className="hidden items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent sm:inline-flex">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-on-accent" />
            {t("available")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher locale={locale} label={`${t("language")}: ${t("switchTo")}`} />
          <ThemeToggle toLight={t("themeToLight")} toDark={t("themeToDark")} />
        </div>
      </div>
    </header>
  );
}
