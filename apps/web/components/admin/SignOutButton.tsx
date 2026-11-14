"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const signOut = async () => {
    setBusy(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <button type="button" onClick={signOut} disabled={busy}
      className="rounded-full border border-muted/40 px-4 py-2 text-sm font-semibold transition-colors hover:border-primary hover:text-primary disabled:opacity-60">
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
