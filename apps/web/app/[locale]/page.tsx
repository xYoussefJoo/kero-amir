import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import type { Locale } from "@/i18n/routing";

// Phase 1 placeholder: proves tokens, fonts, theme and i18n. The real hero lands in Phase 4.
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations("Home");

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center gap-6 px-4 py-24 sm:px-6">
      <p className="font-mono text-xs tracking-[0.2em] text-muted">{t("label")}</p>
      <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-7xl">
        {t("title")}
      </h1>
      <p className="max-w-xl text-lg text-muted">{t("subtitle")}</p>
      <div className="flex flex-wrap gap-3 pt-2">
        <a
          href="#work"
          className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90"
        >
          {t("ctaWork")}
        </a>
        <a
          href="#contact"
          className="rounded-full border border-text px-6 py-3 font-semibold transition-colors hover:border-primary hover:text-primary"
        >
          {t("ctaContact")}
        </a>
      </div>
    </section>
  );
}
