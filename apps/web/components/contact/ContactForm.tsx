"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "@/lib/zod";
import { submitForm } from "@/components/forms/submitForm";
import { Field } from "@/components/reviews/ReviewForm";

export type ContactFormLabels = {
  name: string; email: string; company: string; service: string; budget: string; message: string;
  choose: string; submit: string; sending: string; thanksTitle: string; thanks: string; another: string;
  services: { slug: string; name: string }[];
  budgets: { value: string; label: string }[];
  errors: { name: string; email: string; message: string; rateLimited: string; unavailable: string };
};

/** Mirrors the API's ContactInputValidator. */
function schema(l: ContactFormLabels["errors"], budgets: string[]) {
  return z.object({
    name: z.string().trim().min(1, l.name).max(80),
    email: z.email(l.email).max(200),
    company: z.string().trim().max(100).optional(),
    service: z.string().regex(/^[a-z0-9-]*$/).max(80).optional(),
    budget: z.string().refine((b) => b === "" || budgets.includes(b)).optional(),
    message: z.string().trim().min(20, l.message).max(3000, l.message),
    website: z.string().max(200).optional(), // honeypot
  });
}

/** The contact form. On success it marks the section (data-sent) so the missing piece snaps into place. */
export function ContactForm({ locale, labels }: { locale: string; labels: ContactFormLabels }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const s = schema(labels.errors, labels.budgets.map((b) => b.value));
  const form = useForm<z.input<typeof s>, unknown, z.output<typeof s>>({ resolver: zodResolver(s) });
  const errors = form.formState.errors;

  const markSection = (value: boolean) =>
    document.getElementById("contact")?.toggleAttribute("data-sent", value);

  const onSubmit = form.handleSubmit(async (values) => {
    setError(null);
    const result = await submitForm("contact", {
      ...values,
      company: values.company || null,
      service: values.service || null,
      budget: values.budget || null,
      locale,
    });
    if (result === null) {
      setSent(true);
      markSection(true);
      form.reset();
    } else {
      setError(result === "rate-limited" ? labels.errors.rateLimited : result === "unavailable" ? labels.errors.unavailable : result);
    }
  });

  if (sent) {
    return (
      <div role="status" className="flex flex-col items-start gap-3">
        <h3 className="font-display text-3xl font-semibold">{labels.thanksTitle}</h3>
        <p className="text-muted">{labels.thanks}</p>
        <button type="button" onClick={() => { setSent(false); markSection(false); }}
          className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          {labels.another}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2">
      <Field label={labels.name} error={errors.name?.message}>
        <input autoComplete="name" className="form-input" {...form.register("name")} />
      </Field>
      <Field label={labels.email} error={errors.email?.message}>
        <input type="email" autoComplete="email" className="form-input" {...form.register("email")} />
      </Field>
      <Field label={labels.company}>
        <input autoComplete="organization" className="form-input" {...form.register("company")} />
      </Field>
      <Field label={labels.service}>
        <select className="form-input" defaultValue="" {...form.register("service")}>
          <option value="">{labels.choose}</option>
          {labels.services.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
        </select>
      </Field>
      <Field label={labels.budget} wide>
        <select className="form-input" defaultValue="" {...form.register("budget")}>
          <option value="">{labels.choose}</option>
          {labels.budgets.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </Field>
      <Field label={labels.message} error={errors.message?.message} wide>
        <textarea rows={5} className="form-input resize-y" {...form.register("message")} />
      </Field>
      {/* Honeypot: hidden from people, tempting for bots. */}
      <input type="text" tabIndex={-1} autoComplete="off" aria-hidden className="hp-field" {...form.register("website")} />
      {error && <p role="alert" className="text-sm font-medium text-accent sm:col-span-2">{error}</p>}
      <button type="submit" disabled={form.formState.isSubmitting}
        className="btn btn--primary sm:col-span-2 sm:justify-self-start">
        {form.formState.isSubmitting ? labels.sending : labels.submit}
      </button>
    </form>
  );
}
