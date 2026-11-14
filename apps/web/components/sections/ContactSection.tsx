import { getTranslations } from "next-intl/server";
import { getSettings, setting } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { pieceStyle } from "@/components/puzzle/scatter";

const SOCIALS = ["behance", "instagram", "linkedin", "dribbble"] as const;

/**
 * "Your project is the missing piece": an orange piece snaps into an empty puzzle slot when the section scrolls in
 * (and bounces on hover). Links come from CMS settings (contact.email, socials); empty ones are hidden.
 */
export async function ContactSection({ locale }: { locale: Locale }) {
  const [settings, t] = await Promise.all([getSettings(locale), getTranslations({ locale, namespace: "Contact" })]);
  const email = setting.text(settings, "contact.email");
  const socials = setting.object<Record<(typeof SOCIALS)[number], string | null>>(settings, "socials");
  const links = SOCIALS.flatMap((name) => (socials[name] ? [{ name, href: socials[name]! }] : []));

  return (
    <PuzzleAssemble as="section" id="contact" className="mx-auto w-full max-w-6xl scroll-mt-8 px-4 py-24 sm:px-6">
      <div className="missing-piece pz-card grid items-center gap-10 px-8 py-14 sm:px-12 lg:grid-cols-[1fr_auto]">
        <div className="flex flex-col gap-5">
          <p className="pz-piece font-mono text-xs tracking-[0.2em] text-muted" style={pieceStyle(0, 7)}>{t("label")}</p>
          <h2 className="pz-piece font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl" style={pieceStyle(1, 7)}>
            {t("title")}
          </h2>
          <p className="pz-piece max-w-xl text-lg text-muted" style={pieceStyle(2, 7)}>{t("intro")}</p>
          <div className="pz-piece flex flex-wrap items-center gap-3 pt-2" style={pieceStyle(3, 7)}>
            {email && (
              <a href={`mailto:${email}`} className="missing-piece__cta rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90">
                {t("cta")}
              </a>
            )}
            {links.map((link) => (
              <a key={link.name} href={link.href} target="_blank" rel="noopener noreferrer"
                className="missing-piece__cta rounded-full border border-text px-5 py-2.5 text-sm font-semibold capitalize transition-colors hover:border-primary hover:text-primary">
                {link.name}
              </a>
            ))}
          </div>
        </div>

        {/* The slot and the piece that fits it (the logo's puzzle knob shape). */}
        <div aria-hidden className="missing-piece__slot mx-auto">
          <svg viewBox="0 0 120 120" className="size-36 sm:size-44">
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
