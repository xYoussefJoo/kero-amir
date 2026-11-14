import { getTranslations } from "next-intl/server";
import { getTestimonials, type Testimonial } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { SectionHeader } from "@/components/puzzle/SectionHeader";
import { pieceStyle } from "@/components/puzzle/scatter";
import { ReviewForm, type ReviewFormLabels } from "@/components/reviews/ReviewForm";

const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));
/** Brand palette, cycled so neighbouring pieces always differ (like a printed jigsaw). */
const TONES = ["paper", "blue", "ink", "orange"] as const;
const MAX_PIECES = 8;

function ReviewPiece({ review, tone, regions, index }: {
  review: Testimonial; tone: (typeof TONES)[number]; regions: Intl.DisplayNames; index: number;
}) {
  const rating = Number(review.rating);
  return (
    <li className={`review-piece review-piece--${tone} pz-piece`} style={pieceStyle(3 + index, 9, 0.8)}>
      <figure className="flex h-full flex-col gap-4">
        <div role="img" aria-label={`${rating}/5`} className="review-piece__stars">
          {"★".repeat(rating)}<span className="opacity-30">{"★".repeat(5 - rating)}</span>
        </div>
        <blockquote className="review-piece__text">“{review.text}”</blockquote>
        <figcaption className="mt-auto text-sm leading-tight">
          <strong className="block font-display text-base">{review.authorName}</strong>
          <span className="opacity-75">
            {[review.role, review.company].filter(Boolean).join(" · ")}{" "}
            {review.countryCode && (
              <span role="img" aria-label={regions.of(review.countryCode) ?? review.countryCode}>{flag(review.countryCode)}</span>
            )}
          </span>
        </figcaption>
      </figure>
    </li>
  );
}

/**
 * "The review puzzle": approved reviews as interlocking jigsaw pieces in the brand colours. The last piece is
 * missing: an empty slot that opens the review form. Static by design (no looping animation): pieces lift on hover.
 */
export async function ReviewsSection({ locale }: { locale: Locale }) {
  const [reviews, t] = await Promise.all([getTestimonials(), getTranslations({ locale, namespace: "Reviews" })]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  const pieces = reviews.slice(0, MAX_PIECES);

  const labels: ReviewFormLabels = {
    open: t("form.open"), title: t("form.title"), intro: t("form.intro"), name: t("form.name"),
    role: t("form.role"), company: t("form.company"), country: t("form.country"), rating: t("form.rating"),
    text: t("form.text"), submit: t("form.submit"), sending: t("form.sending"), close: t("form.close"),
    thanks: t("form.thanks"),
    errors: {
      name: t("form.errors.name"), text: t("form.errors.text"), country: t("form.errors.country"),
      rating: t("form.errors.rating"), rateLimited: t("form.errors.rateLimited"), unavailable: t("form.errors.unavailable"),
    },
  };

  return (
    <PuzzleAssemble as="section" id="reviews" className="mx-auto flex w-full max-w-6xl scroll-mt-20 flex-col gap-14 px-4 py-24 sm:px-6" threshold={0.1}>
      <SectionHeader label={t("label")} title={t("title")} intro={pieces.length ? t("intro") : t("empty")} />

      <ul className="review-wall">
        {pieces.map((review, i) => (
          <ReviewPiece key={review.id} review={review} tone={TONES[i % TONES.length]} regions={regions} index={i} />
        ))}
        {/* The missing piece: where the next client's review fits. */}
        <li className="review-piece review-piece--slot pz-piece" style={pieceStyle(3 + pieces.length, 9, 0.8)}>
          <ReviewForm
            locale={locale}
            labels={labels}
            triggerClassName="review-slot"
            trigger={
              <>
                <span aria-hidden className="review-slot__plus">+</span>
                <span className="font-display text-xl font-semibold">{t("slotTitle")}</span>
                <span className="text-sm opacity-75">{t("slotText")}</span>
              </>
            }
          />
        </li>
      </ul>
    </PuzzleAssemble>
  );
}
