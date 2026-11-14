"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "@/lib/zod";

const passwordSchema = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(1, "Enter your password."),
});

const codeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app."),
});

type PasswordValues = z.infer<typeof passwordSchema>;
type CodeValues = z.infer<typeof codeSchema>;

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { ok: response.ok, data: await response.json().catch(() => ({})) };
}

export function LoginForm() {
  const router = useRouter();
  const [step, setStep] = useState<"password" | "code">("password");
  const [error, setError] = useState<string | null>(null);

  const passwordForm = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) });
  const codeForm = useForm<CodeValues>({ resolver: zodResolver(codeSchema) });

  const signedIn = () => {
    router.replace("/admin");
    router.refresh();
  };

  const submitPassword = passwordForm.handleSubmit(async (values) => {
    setError(null);
    const { ok, data } = await post("/api/auth/login", values);
    if (!ok) return setError(String(data.error ?? "Sign-in failed."));
    if (data.requiresTwoFactor) setStep("code");
    else signedIn();
  });

  const submitCode = codeForm.handleSubmit(async (values) => {
    setError(null);
    const { ok, data } = await post("/api/auth/2fa", values);
    if (!ok) return setError(String(data.error ?? "Verification failed."));
    signedIn();
  });

  const busy = passwordForm.formState.isSubmitting || codeForm.formState.isSubmitting;

  return (
    <div className="rounded-2xl border border-muted/25 bg-surface p-6 shadow-sm">
      {error && (
        <p role="alert" className="mb-4 rounded-lg border border-accent/60 px-3 py-2 text-sm">
          {error}
        </p>
      )}

      {step === "password" ? (
        <form onSubmit={submitPassword} noValidate className="flex flex-col gap-4">
          <Field label="Email" error={passwordForm.formState.errors.email?.message}>
            <input type="email" autoComplete="username" autoFocus className={inputClass}
              {...passwordForm.register("email")} />
          </Field>
          <Field label="Password" error={passwordForm.formState.errors.password?.message}>
            <input type="password" autoComplete="current-password" className={inputClass}
              {...passwordForm.register("password")} />
          </Field>
          <Submit busy={busy}>Sign in</Submit>
        </form>
      ) : (
        <form onSubmit={submitCode} noValidate className="flex flex-col gap-4">
          <p className="text-sm text-muted">Enter the code from your authenticator app.</p>
          <Field label="6-digit code" error={codeForm.formState.errors.code?.message}>
            <input inputMode="numeric" autoComplete="one-time-code" maxLength={6} autoFocus
              className={`${inputClass} font-mono tracking-[0.4em]`} {...codeForm.register("code")} />
          </Field>
          <Submit busy={busy}>Verify</Submit>
          <button type="button" onClick={() => { setStep("password"); setError(null); }}
            className="text-sm text-muted underline-offset-4 hover:text-primary hover:underline">
            Use a different account
          </button>
        </form>
      )}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-muted/40 bg-bg px-3 py-2.5 text-text outline-none transition-colors focus:border-primary";

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-sm font-medium">
      {label}
      {children}
      {error && <span className="text-xs font-normal text-muted">{error}</span>}
    </label>
  );
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return (
    <button type="submit" disabled={busy}
      className="mt-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-opacity hover:opacity-90 disabled:opacity-60">
      {busy ? "Please wait…" : children}
    </button>
  );
}
