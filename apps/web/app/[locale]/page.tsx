import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { use } from "react";
import type { Locale } from "@/i18n/routing";
import { HeroLogo } from "@/components/hero/HeroLogo";

// Hero with the puzzle K. Texts move to CMS settings when the public site is built out (Phase 4).
export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale as Locale);
  const t = useTranslations("Home");

  return (
    <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-4 py-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:py-20">
      <div className="order-2 flex flex-col gap-6 lg:order-1">
        <p className="font-mono text-xs tracking-[0.2em] text-muted">{t("label")}</p>
        <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-tight sm:text-7xl">
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
      </div>

      <div className="order-1 flex justify-center lg:order-2">
        <HeroLogo />
      </div>
    </section>
  );
}
