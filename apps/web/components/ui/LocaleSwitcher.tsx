"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

export function LocaleSwitcher() {
  const t = useTranslations("Header");
  const locale = useLocale();
  const pathname = usePathname();
  const other = locale === "en" ? "de" : "en";

  return (
    <Link
      href={pathname}
      locale={other}
      hrefLang={other}
      aria-label={`${t("language")}: ${t("switchTo")}`}
      className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-primary"
    >
      {other}
    </Link>
  );
}
