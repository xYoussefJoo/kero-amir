import type { Metadata } from "next";
import { Suspense } from "react";
import { getMe } from "@/lib/server/admin";
import { TwoFactorCard } from "@/components/admin/TwoFactorCard";
import { PasswordCard } from "@/components/admin/PasswordCard";
import { ListSkeleton } from "@/components/admin/ListSkeleton";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-col gap-2">
        <p className="type-label">06 // Account</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Account and security</h1>
      </header>
      <Suspense fallback={<ListSkeleton rows={2} />}>
        <Account />
      </Suspense>
    </div>
  );
}

async function Account() {
  const me = await getMe();
  return (
    <>
      <p className="text-muted">Signed in as <strong className="text-text">{me.email}</strong></p>
      <TwoFactorCard enabled={me.twoFactorEnabled} codesLeft={Number(me.recoveryCodesLeft)} email={me.email} />
      <PasswordCard />
    </>
  );
}
