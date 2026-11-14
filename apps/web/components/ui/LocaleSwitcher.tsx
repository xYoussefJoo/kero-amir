"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Same page in the other language. Plain next/link + usePathname: the locale and label come from the server
 * (SiteHeader), so no translation runtime ships to the browser.
 */
export function LocaleSwitcher({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const other = routing.locales.find((l) => l !== locale) ?? routing.defaultLocale;
  const href = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), `/${other}`);

  return (
    <Link
      href={href}
      hrefLang={other}
      aria-label={label}
      className="font-mono text-xs uppercase tracking-widest text-muted transition-colors hover:text-primary"
    >
      {other}
    </Link>
  );
}
