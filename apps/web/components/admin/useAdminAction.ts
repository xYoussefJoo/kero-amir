"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

/**
 * Runs an admin change through the BFF (/api/bff/admin/...), then re-renders the server page so lists and counts
 * (including the nav badges) are current. `pending` covers both the request and the refresh.
 */
export function useAdminAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (path: string, method: "PUT" | "POST" | "DELETE", body?: unknown) =>
    startTransition(async () => {
      setError(null);
      const response = await fetch(`/api/bff/admin/${path}`, {
        method,
        headers: body === undefined ? undefined : { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      }).catch(() => null);
      if (!response?.ok) {
        setError(response?.status === 401 ? "Your session ended. Sign in again." : "That didn't save. Try again.");
        return;
      }
      router.refresh();
    });

  return { run, pending, error };
}
