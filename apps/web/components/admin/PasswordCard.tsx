"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "@/lib/zod";
import { AdminField, FormMessages } from "./AdminField";
import { saveAdmin } from "./saveAdmin";

const schema = z.object({
  currentPassword: z.string().min(1, "Required."),
  newPassword: z.string().min(12, "Use at least 12 characters.").max(200),
  confirm: z.string(),
}).refine((v) => v.newPassword === v.confirm, { path: ["confirm"], message: "The two new passwords don't match." })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Choose a different password." });

type Values = z.infer<typeof schema>;

/** Changing the password ends every session (the API revokes all refresh tokens), including this one. */
export function PasswordCard() {
  const router = useRouter();
  const [messages, setMessages] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema) });

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setMessages([]);
    const result = await saveAdmin("account/password", "POST", { currentPassword, newPassword });
    if (!result.ok) return setMessages(result.messages);
    setDone(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setTimeout(() => { router.replace("/admin/login"); router.refresh(); }, 1800);
  });

  return (
    <section className="admin-panel">
      <div>
        <h2 className="font-display text-lg font-semibold">Password</h2>
        <p className="text-sm text-muted">Changing it signs you out everywhere, including here.</p>
      </div>
      {done ? (
        <p role="status" className="admin-alert">Password changed. Signing you out so you can sign in with the new one…</p>
      ) : (
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <div className="admin-form-grid">
            <AdminField label="Current password" error={errors.currentPassword?.message} wide>
              <input type="password" autoComplete="current-password" className="form-input" {...register("currentPassword")} />
            </AdminField>
            <AdminField label="New password" error={errors.newPassword?.message} hint="At least 12 characters. A short sentence works well.">
              <input type="password" autoComplete="new-password" className="form-input" {...register("newPassword")} />
            </AdminField>
            <AdminField label="New password again" error={errors.confirm?.message}>
              <input type="password" autoComplete="new-password" className="form-input" {...register("confirm")} />
            </AdminField>
          </div>
          <FormMessages messages={messages} />
          <button type="submit" disabled={isSubmitting} className="admin-btn admin-btn--primary self-start">
            {isSubmitting ? "Saving…" : "Change password"}
          </button>
        </form>
      )}
    </section>
  );
}
