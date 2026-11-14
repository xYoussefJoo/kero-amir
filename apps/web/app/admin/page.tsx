import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { api, authHeaders } from "@/lib/api/client";
import { Cookies } from "@/lib/server/session";
import { Logo } from "@/components/ui/Logo";
import { SignOutButton } from "@/components/admin/SignOutButton";

export const metadata: Metadata = { title: "Dashboard" };

// Phase 2 placeholder: proves the session end to end (proxy refresh → cookie → API with Bearer).
// The real dashboard arrives in Phase 7.
export default function AdminHome() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo size={36} priority />
          <span className="font-display text-xl font-semibold">Admin</span>
        </div>
        <SignOutButton />
      </header>
      <Suspense fallback={<div className="h-24 animate-pulse rounded-2xl bg-surface" />}>
        <Welcome />
      </Suspense>
    </main>
  );
}

async function Welcome() {
  const token = (await cookies()).get(Cookies.access)?.value;
  if (!token) redirect("/admin/login");

  const { data, response } = await api.GET("/api/v1/admin/account/me", { headers: authHeaders(token) });
  if (response.status === 401) redirect("/admin/login");
  if (!data) throw new Error(`Could not load the account (HTTP ${response.status}).`);

  return (
    <section className="rounded-2xl border border-muted/25 bg-surface p-6">
      <p className="font-mono text-xs tracking-[0.2em] text-muted">01 // SIGNED IN</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-muted">
        {data.email} · {data.roles.join(", ")}
      </p>
      <p className="mt-4 text-sm">
        Two-factor authentication:{" "}
        <strong>{data.twoFactorEnabled ? "on" : "off (turn it on before going live)"}</strong>
      </p>
    </section>
  );
}
