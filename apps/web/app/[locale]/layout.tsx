import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { clash, inter, jetbrains } from "../fonts";
import { ThemeScript } from "@/components/ui/ThemeScript";
import { SiteHeader } from "@/components/sections/SiteHeader";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F0E7" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1120" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: LayoutProps<"/[locale]">): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Meta" });
  return {
    // Absolute URLs for canonical / hreflang / Open Graph: search engines ignore relative hreflang.
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `/${locale}`,
      languages: { ...Object.fromEntries(routing.locales.map((l) => [l, `/${l}`])), "x-default": "/" },
    },
    // The image itself comes from opengraph-image.tsx next to this layout.
    openGraph: {
      type: "website",
      siteName: "Kero Amir",
      title: t("title"),
      description: t("description"),
      url: `/${locale}`,
      locale: locale === "de" ? "de_DE" : "en_US",
    },
    twitter: { card: "summary_large_image", title: t("title"), description: t("description") },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "Header" });

  return (
    <html
      lang={locale}
      dir="ltr"
      data-theme="light"
      suppressHydrationWarning
      className={`${clash.variable} ${inter.variable} ${jetbrains.variable} h-full antialiased`}
    >
      <head>
        <ThemeScript />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded bg-primary px-4 py-2 text-on-primary focus:not-sr-only focus:fixed focus:start-4 focus:top-4"
        >
          {t("skipToContent")}
        </a>
        {/* No NextIntlClientProvider: translations render on the server; client components get plain strings. */}
        <SiteHeader />
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
