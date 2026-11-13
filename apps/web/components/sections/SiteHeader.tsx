import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/ui/Logo";
import { LocaleSwitcher } from "@/components/ui/LocaleSwitcher";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function SiteHeader() {
  const t = useTranslations("Header");

  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
      <div className="flex items-center gap-3">
        <Link href="/" className="rounded-sm">
          <Logo size={40} priority />
        </Link>
        {/* Availability comes from CMS settings in Phase 2. */}
        <span className="hidden items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent sm:inline-flex">
          <span aria-hidden="true" className="size-1.5 rounded-full bg-on-accent" />
          {t("available")}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
    </header>
  );
}
