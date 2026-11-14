"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";
import { submitForm } from "@/components/forms/submitForm";

export type ReviewFormLabels = {
  open: string; title: string; intro: string; name: string; role: string; company: string; country: string;
  rating: string; text: string; submit: string; sending: string; close: string; thanks: string;
  errors: { name: string; text: string; country: string; rating: string; rateLimited: string; unavailable: string };
};

/** Mirrors the API's TestimonialInputValidator, so most mistakes are caught before sending. */
function schema(l: ReviewFormLabels["errors"]) {
  return z.object({
    authorName: z.string().trim().min(1, l.name).max(80),
    role: z.string().trim().max(80).optional(),
    company: z.string().trim().max(80).optional(),
    countryCode: z.string().trim().toUpperCase().regex(/^([A-Z]{2})?$/, l.country).optional(),
    rating: z.coerce.number().int().min(1, l.rating).max(5, l.rating),
    text: z.string().trim().min(20, l.text).max(600, l.text),
    website: z.string().max(200).optional(), // honeypot
  });
}

/** `trigger`: optional custom opener (e.g. the empty puzzle slot); defaults to a button with labels.open. */
export function ReviewForm({ locale, labels, triggerClassName, trigger }: {
  locale: string;
  labels: ReviewFormLabels;
  triggerClassName?: string;
  trigger?: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.input<ReturnType<typeof schema>>, unknown, z.output<ReturnType<typeof schema>>>({
    resolver: zodResolver(schema(labels.errors)),
    defaultValues: { rating: 5 },
  });
  const rating = Number(useWatch({ control: form.control, name: "rating" }) ?? 5);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await submitForm("testimonial", { ...values, countryCode: values.countryCode || null, locale });
    if (result === null) {
      setSent(true);
      form.reset();
    } else {
      setError(result === "rate-limited" ? labels.errors.rateLimited : result === "unavailable" ? labels.errors.unavailable : result);
    }
  });

  const close = () => {
    dialog.current?.close();
    setSent(false);
    setError(null);
  };

  const errors = form.formState.errors;

  return (
    <>
      <button type="button" onClick={() => dialog.current?.showModal()}
        className={triggerClassName ?? "rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90"}>
        {trigger ?? labels.open}
      </button>

      <dialog ref={dialog} className="review-dialog pz-card" aria-labelledby="review-title" onClose={close}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 id="review-title" className="font-display text-2xl font-semibold">{labels.title}</h3>
            <p className="mt-1 text-sm text-muted">{labels.intro}</p>
          </div>
          <button type="button" onClick={close} aria-label={labels.close} className="text-2xl leading-none text-muted hover:text-text">×</button>
        </div>

        {sent ? (
          <p role="status" className="mt-6 rounded-xl bg-primary/10 p-4 font-medium text-primary">{labels.thanks}</p>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-6 grid gap-4 sm:grid-cols-2">
            <Field label={labels.name} error={errors.authorName?.message} wide>
              <input autoComplete="name" className="form-input" {...form.register("authorName")} />
            </Field>
            <Field label={labels.role}><input className="form-input" {...form.register("role")} /></Field>
            <Field label={labels.company}><input autoComplete="organization" className="form-input" {...form.register("company")} /></Field>
            <Field label={labels.country} error={errors.countryCode?.message}>
              <input maxLength={2} placeholder="DE" className="form-input uppercase" {...form.register("countryCode")} />
            </Field>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1.5 text-sm font-medium">{labels.rating}</legend>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer text-2xl" aria-label={`${n}/5`}>
                    <input type="radio" value={n} className="sr-only" {...form.register("rating")} />
                    <span aria-hidden className={n <= rating ? "text-accent" : "text-muted/40"}>★</span>
                  </label>
                ))}
              </div>
            </fieldset>
            <Field label={labels.text} error={errors.text?.message} wide>
              <textarea rows={4} className="form-input resize-y" {...form.register("text")} />
            </Field>
            {/* Honeypot: hidden from people, tempting for bots. */}
            <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hp-field" {...form.register("website")} />
            {error && <p role="alert" className="text-sm font-medium text-accent sm:col-span-2">{error}</p>}
            <button type="submit" disabled={form.formState.isSubmitting}
              className="rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60 sm:col-span-2">
              {form.formState.isSubmitting ? labels.sending : labels.submit}
            </button>
          </form>
        )}
      </dialog>
    </>
  );
}

export function Field({ label, error, wide, children }: { label: string; error?: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm font-medium ${wide ? "sm:col-span-2" : ""}`}>
      {label}
      {children}
      {error && <span className="text-xs font-normal text-accent">{error}</span>}
    </label>
  );
}
