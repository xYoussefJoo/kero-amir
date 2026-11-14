import type { CSSProperties } from "react";
import { getTranslations } from "next-intl/server";
import { getTestimonials, type Testimonial } from "@/lib/content";
import type { Locale } from "@/i18n/routing";
import { PuzzleAssemble } from "@/components/puzzle/PuzzleAssemble";
import { SectionHeader } from "@/components/puzzle/SectionHeader";
import { ReviewForm } from "@/components/reviews/ReviewForm";

const flag = (code: string) => String.fromCodePoint(...[...code.toUpperCase()].map((c) => 0x1f1a5 + c.charCodeAt(0)));

function ReviewCard({ review, regions }: { review: Testimonial; regions: Intl.DisplayNames }) {
  const rating = Number(review.rating);
  return (
    <figure className="review-card pz-card">
      <div aria-label={`${rating}/5`} role="img" className="text-accent">{"★".repeat(rating)}<span className="text-muted/30">{"★".repeat(5 - rating)}</span></div>
      <blockquote className="text-[0.95rem] leading-relaxed">“{review.text}”</blockquote>
      <figcaption className="mt-auto flex items-center gap-3">
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-primary font-semibold text-on-primary">
          {review.authorName[0]?.toUpperCase()}
        </span>
        <span className="flex flex-col text-sm leading-tight">
          <strong>{review.authorName}</strong>
          <span className="text-muted">
            {[review.role, review.company].filter(Boolean).join(" · ")}{" "}
            {review.countryCode && <span role="img" aria-label={regions.of(review.countryCode) ?? review.countryCode}>{flag(review.countryCode)}</span>}
          </span>
        </span>
      </figcaption>
    </figure>
  );
}

/** One endless band: the list twice (second copy hidden from assistive tech) so the loop is seamless. */
function Band({ reviews, reverse, regions }: { reviews: Testimonial[]; reverse?: boolean; regions: Intl.DisplayNames }) {
  const style = { "--duration": `${Math.max(30, reviews.length * 9)}s` } as CSSProperties;
  return (
    <div className="ticker" data-reverse={reverse ? "" : undefined} style={style}>
      <ul className="ticker__track">
        {reviews.map((r) => <li key={r.id}><ReviewCard review={r} regions={regions} /></li>)}
        {reviews.map((r) => <li key={`${r.id}-copy`} aria-hidden><ReviewCard review={r} regions={regions} /></li>)}
      </ul>
    </div>
  );
}

export async function ReviewsSection({ locale }: { locale: Locale }) {
  const [reviews, t] = await Promise.all([getTestimonials(), getTranslations({ locale, namespace: "Reviews" })]);
  const regions = new Intl.DisplayNames([locale], { type: "region" });
  // Short lists repeat so each band is wide enough to loop without gaps.
  const band = reviews.length > 0 ? Array.from({ length: Math.ceil(6 / reviews.length) }, () => reviews).flat() : [];
  const unique = (list: Testimonial[], tag: string) => list.map((r, i) => ({ ...r, id: `${r.id}-${tag}${i}` }));

  return (
    <PuzzleAssemble as="section" id="reviews" className="flex w-full scroll-mt-20 flex-col gap-12 py-24" threshold={0.1}>
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 sm:px-6">
        <SectionHeader label={t("label")} title={t("title")} intro={reviews.length ? t("intro") : t("empty")} />
        <div className="pz-piece">
          <ReviewForm
            locale={locale}
            labels={{
              open: t("form.open"), title: t("form.title"), intro: t("form.intro"), name: t("form.name"),
              role: t("form.role"), company: t("form.company"), country: t("form.country"), rating: t("form.rating"),
              text: t("form.text"), submit: t("form.submit"), sending: t("form.sending"), close: t("form.close"),
              thanks: t("form.thanks"),
              errors: {
                name: t("form.errors.name"), text: t("form.errors.text"), country: t("form.errors.country"),
                rating: t("form.errors.rating"), rateLimited: t("form.errors.rateLimited"), unavailable: t("form.errors.unavailable"),
              },
            }}
          />
        </div>
      </div>

      {band.length > 0 && (
        <div className="flex flex-col gap-6">
          <Band reviews={unique(band, "a")} regions={regions} />
          <Band reviews={unique([...band].reverse(), "b")} reverse regions={regions} />
        </div>
      )}
    </PuzzleAssemble>
  );
}
