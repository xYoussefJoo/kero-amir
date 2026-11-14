import { getTranslations } from "next-intl/server";
import { getCategories, getSettings, setting } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { pieceStyle } from "@/components/puzzle/scatter";
import { ContactForm } from "@/components/contact/ContactForm";

const SOCIALS = ["behance", "instagram", "linkedin", "dribbble"] as const;
const BUDGETS = ["under-1k", "1k-3k", "3k-10k", "10k-plus", "not-sure"] as const;

/**
 * "Your project is the missing piece": a real contact form beside an empty puzzle slot. The orange piece snaps in
 * when the section scrolls into view, and celebrates when a message is sent (data-sent, set by ContactForm).
 * Social links come from CMS settings; empty ones are hidden.
 */
export async function ContactSection({ locale }: { locale: Locale }) {
  const [settings, categories, t] = await Promise.all([
    getSettings(locale),
    getCategories(locale),
    getTranslations({ locale, namespace: "Contact" }),
  ]);
  const socials = setting.object<Record<(typeof SOCIALS)[number], string | null>>(settings, "socials");
  const links = SOCIALS.flatMap((name) => (socials[name] ? [{ name, href: socials[name]! }] : []));

  return (
    <PuzzleAssemble as="section" id="contact" className="mx-auto w-full max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6" threshold={0.15}>
      <div className="missing-piece pz-card grid items-start gap-12 px-6 py-12 sm:px-12 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex flex-col gap-5">
          <p className="pz-piece font-mono text-xs tracking-[0.2em] text-muted" style={pieceStyle(0, 7)}>{t("label")}</p>
          <h2 className="pz-piece font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl" style={pieceStyle(1, 7)}>
            {t("title")}
          </h2>
          <p className="pz-piece max-w-xl text-lg text-muted" style={pieceStyle(2, 7)}>{t("intro")}</p>
          <div className="pz-piece pt-2" style={pieceStyle(3, 7)}>
            <ContactForm
              locale={locale}
              labels={{
                name: t("form.name"), email: t("form.email"), company: t("form.company"), service: t("form.service"),
                budget: t("form.budget"), message: t("form.message"), choose: t("form.choose"), submit: t("form.submit"),
                sending: t("form.sending"), thanksTitle: t("form.thanksTitle"), thanks: t("form.thanks"), another: t("form.another"),
                services: [...categories.map((c) => ({ slug: c.slug, name: c.name })), { slug: "other", name: t("form.other") }],
                budgets: BUDGETS.map((value) => ({ value, label: t(`budgets.${value}`) })),
                errors: {
                  name: t("form.errors.name"), email: t("form.errors.email"), message: t("form.errors.message"),
                  rateLimited: t("form.errors.rateLimited"), unavailable: t("form.errors.unavailable"),
                },
              }}
            />
          </div>
          {links.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
              {links.map((link) => (
                <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="rounded-full border border-text px-5 py-2.5 text-sm font-semibold capitalize transition-colors hover:border-primary hover:text-primary">
                  {link.name}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* The slot and the piece that fits it (the logo's puzzle knob shape). */}
        <div aria-hidden className="missing-piece__slot mx-auto self-center">
          <svg viewBox="0 0 120 120" className="size-48 sm:size-64">
            <path className="missing-piece__outline" d={PIECE} />
            <path className="missing-piece__fill" d={PIECE} />
          </svg>
        </div>
      </div>
    </PuzzleAssemble>
  );
}

// A jigsaw piece: square body with a knob on top and right, sockets on the left and bottom.
const PIECE =
  "M20 30 H48 C48 20 54 14 60 14 C66 14 72 20 72 30 H100 V58 C110 58 116 64 116 70 C116 76 110 82 100 82 V110 " +
  "H72 C72 100 66 94 60 94 C54 94 48 100 48 110 H20 V82 C30 82 36 76 36 70 C36 64 30 58 20 58 Z";
