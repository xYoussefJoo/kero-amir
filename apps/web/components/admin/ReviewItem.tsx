"use client";

import type { components } from "@/lib/api/schema";
import { useAdminAction } from "./useAdminAction";

type Review = components["schemas"]["TestimonialAdminDto"];
type Status = components["schemas"]["ModerationStatus"];

/** One review with its moderation actions. Approved reviews go live on the site at the next visit. */
export function ReviewItem({ review, when, country }: { review: Review; when: string; country?: string }) {
  const { run, pending, error } = useAdminAction();
  const rating = Number(review.rating);
  const moderate = (status: Status, isFeatured = review.isFeatured) =>
    run(`testimonials/${review.id}/moderation`, "PUT", { status, isFeatured });
  const remove = () => {
    if (confirm(`Delete the review from ${review.authorName}? This can't be undone.`)) run(`testimonials/${review.id}`, "DELETE");
  };

  return (
    <li className="admin-item" data-status={review.status} aria-busy={pending || undefined}>
      <div className="admin-item__body !border-0 !pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex flex-wrap items-baseline gap-x-2">
              <strong className="font-display text-lg">{review.authorName}</strong>
              <span className="text-sm text-muted">
                {[review.role, review.company, country].filter(Boolean).join(" · ")}
              </span>
            </p>
            <p aria-label={`${rating} of 5 stars`} className="tracking-widest text-accent">
              {"★".repeat(rating)}<span className="opacity-25">{"★".repeat(5 - rating)}</span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <time dateTime={review.createdAt} className="text-xs text-muted">{when}</time>
            <span className={`admin-chip admin-chip--${review.status.toLowerCase()}`}>
              {review.status}{review.isFeatured ? " · Featured" : ""}
            </span>
          </div>
        </div>

        <blockquote className="leading-relaxed">“{review.text}”</blockquote>
        <p className="text-xs text-muted">Written in {review.locale === "de" ? "German" : "English"}</p>

        <div className="flex flex-wrap gap-2">
          {review.status !== "Approved" && (
            <button type="button" disabled={pending} onClick={() => moderate("Approved")} className="admin-btn admin-btn--primary">Approve</button>
          )}
          {review.status === "Approved" && (
            <button type="button" disabled={pending} onClick={() => moderate("Approved", !review.isFeatured)} className="admin-btn">
              {review.isFeatured ? "Unfeature" : "Feature first"}
            </button>
          )}
          {review.status !== "Rejected" && (
            <button type="button" disabled={pending} onClick={() => moderate("Rejected", false)} className="admin-btn">
              {review.status === "Approved" ? "Hide from site" : "Reject"}
            </button>
          )}
          <button type="button" disabled={pending} onClick={remove} className="admin-btn admin-btn--danger ms-auto">Delete</button>
        </div>
        {error && <p role="alert" className="text-sm text-accent">{error}</p>}
      </div>
    </li>
  );
}
