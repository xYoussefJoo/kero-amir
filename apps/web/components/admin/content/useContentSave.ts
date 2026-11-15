"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { saveAdmin } from "../saveAdmin";

/** Saves a content form (create = POST to the resource, edit = PUT to its id), then refreshes the page and closes. */
export function useContentSave(resource: string, id: string | undefined, close: () => void) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const save = async (body: unknown) => {
    setBusy(true);
    setMessages([]);
    const result = id ? await saveAdmin(`${resource}/${id}`, "PUT", body) : await saveAdmin(resource, "POST", body);
    setBusy(false);
    if (!result.ok) return setMessages(result.messages);
    close();
    router.refresh();
  };

  return { save, busy, messages };
}
