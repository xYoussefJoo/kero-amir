"use client";

import { useRef, useState } from "react";

const MAX_SIDE = 2400;
const MAX_BYTES = 3 * 1024 * 1024; // the API's limit

/**
 * Shrinks a photo in the browser before upload: at most 2400 px on the long side, re-encoded as WebP. A 10 MB phone
 * photo becomes a few hundred KB, so uploads are quick and the database stays small.
 */
async function prepare(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const quality of [0.85, 0.75, 0.6]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= MAX_BYTES) return blob;
  }
  throw new Error("This image is too large even after shrinking it.");
}

/** Pick an image → it is resized, uploaded, and its site path (/media/…) handed to the form. */
export function ImageUpload({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const upload = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const blob = await prepare(file);
      const form = new FormData();
      form.append("file", blob, file.name.replace(/\.[^.]+$/, "") + ".webp");
      const response = await fetch("/api/bff/admin/media", { method: "POST", body: form });
      const body = (await response.json().catch(() => ({}))) as { url?: string; errors?: Record<string, string[]>; detail?: string };
      if (!response.ok || !body.url) throw new Error(body.errors ? Object.values(body.errors).flat()[0] : body.detail ?? "The upload failed. Try again.");
      onChange(body.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "The upload failed. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex flex-col gap-2 text-sm font-medium sm:col-span-2">
      {label}
      <div className="admin-upload">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- admin preview of an uploaded image
          <img src={value} alt="" className="admin-upload__preview" />
        ) : (
          <span className="admin-upload__empty">No image yet: the card uses the accent colour.</span>
        )}
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => input.current?.click()} disabled={busy} className="admin-btn admin-btn--primary">
            {busy ? "Uploading…" : value ? "Replace image" : "Upload image"}
          </button>
          {value && !busy && <button type="button" onClick={() => onChange("")} className="admin-btn">Remove</button>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>
      <span className="text-xs font-normal text-muted">JPEG, PNG, WebP or AVIF. Big photos are shrunk automatically.</span>
      {error && <span role="alert" className="text-xs font-normal text-accent">{error}</span>}
    </div>
  );
}
