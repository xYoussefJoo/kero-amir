import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { Logo } from "@/components/ui/Logo";

const SECTIONS = ["about", "toolkit", "work", "journey", "reviews", "contact"] as const;

/** The current year, cached for a day (static pages may not read the clock directly). */
async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Big wordmark, section links and the essentials. Server-rendered, no JavaScript. */
export async function SiteFooter({ locale }: { locale: Locale }) {
  const [t, nav, year] = await Promise.all([
    getTranslations({ locale, namespace: "Footer" }),
    getTranslations({ locale, namespace: "Header" }),
    currentYear(),
  ]);

  return (
    <footer className="site-footer">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 pb-10 pt-20 sm:px-6">
        <p className="site-footer__wordmark type-hero">{t("wordmark")}</p>
        <div className="flex flex-col gap-8 border-t border-current/15 pt-8 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Logo size={36} inverted />
            <span className="font-display text-lg font-semibold">Kero Amir</span>
          </div>
          <nav aria-label={nav("navLabel")}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {SECTIONS.map((id) => (
                <li key={id}>
                  <a href={`#${id}`} className="opacity-75 transition-opacity hover:opacity-100">{nav(`nav.${id}`)}</a>
                </li>
              ))}
            </ul>
          </nav>
          <a href="#main" className="text-sm font-semibold underline-offset-4 hover:underline">{t("top")} ↑</a>
        </div>
        <p className="text-xs opacity-60">© {year} Kero Amir. {t("rights")}</p>
      </div>
    </footer>
  );
}
