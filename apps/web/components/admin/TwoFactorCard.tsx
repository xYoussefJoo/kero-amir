"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { components } from "@/lib/api/schema";
import { FormMessages } from "./AdminField";
import { saveAdmin } from "./saveAdmin";

type Setup = components["schemas"]["TwoFactorSetupResponse"];
type Codes = components["schemas"]["RecoveryCodesResponse"];

/** What the card shows: the current state, a setup in progress, a code prompt for an action, or new recovery codes. */
type View =
  | { kind: "idle" }
  | { kind: "setup"; setup: Setup; qr: string }
  | { kind: "confirm"; action: "disable" | "new-codes" }
  | { kind: "codes"; codes: string[] };

/**
 * Two-factor sign-in (TOTP): scan a QR code with an authenticator app, confirm with a code, then save the one-time
 * recovery codes. Turning it off or making new recovery codes also asks for a current code.
 */
export function TwoFactorCard({ enabled, codesLeft, email }: { enabled: boolean; codesLeft: number; email: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "idle" });
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);

  const reset = () => { setCode(""); setMessages([]); };

  const start = async () => {
    reset();
    setBusy(true);
    const result = await saveAdmin<Setup>("account/2fa/setup", "POST");
    if (result.ok) {
      // Loaded only here: the QR library never ships with the rest of the dashboard.
      const QRCode = await import("qrcode");
      const qr = await QRCode.toDataURL(result.data.authenticatorUri, { margin: 1, width: 220, color: { dark: "#0E1120", light: "#FFFFFF" } });
      setView({ kind: "setup", setup: result.data, qr });
    } else setMessages(result.messages);
    setBusy(false);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) return setMessages(["Enter the 6-digit code from your authenticator app."]);
    setMessages([]);
    setBusy(true);
    if (view.kind === "setup") {
      const result = await saveAdmin<Codes>("account/2fa/enable", "POST", { code });
      if (result.ok) setView({ kind: "codes", codes: result.data.codes });
      else setMessages(result.messages);
    } else if (view.kind === "confirm" && view.action === "new-codes") {
      const result = await saveAdmin<Codes>("account/2fa/recovery-codes", "POST", { code });
      if (result.ok) setView({ kind: "codes", codes: result.data.codes });
      else setMessages(result.messages);
    } else if (view.kind === "confirm") {
      const result = await saveAdmin("account/2fa/disable", "POST", { code });
      if (result.ok) { setView({ kind: "idle" }); router.refresh(); }
      else setMessages(result.messages);
    }
    setCode("");
    setBusy(false);
  };

  const finish = () => { reset(); setView({ kind: "idle" }); router.refresh(); };

  return (
    <section className="admin-panel">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold">Two-factor sign-in</h2>
          <p className="text-sm text-muted">A 6-digit code from your phone on every sign-in, so a stolen password isn&apos;t enough.</p>
        </div>
        <span className={`admin-chip ${enabled ? "admin-chip--approved" : "admin-chip--pending"}`}>{enabled ? "On" : "Off"}</span>
      </header>

      {view.kind === "idle" && !enabled && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm">You&apos;ll need an authenticator app such as Google Authenticator, Microsoft Authenticator or 1Password.</p>
          <button type="button" onClick={start} disabled={busy} className="admin-btn admin-btn--primary">{busy ? "Preparing…" : "Turn on"}</button>
        </div>
      )}

      {view.kind === "idle" && enabled && (
        <div className="flex flex-col gap-3">
          <p className={`text-sm ${codesLeft <= 2 ? "font-semibold text-accent" : ""}`}>
            {codesLeft} of 8 recovery codes left.{codesLeft <= 2 && " Make a new set soon."}
          </p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => { reset(); setView({ kind: "confirm", action: "new-codes" }); }} className="admin-btn">New recovery codes</button>
            <button type="button" onClick={() => { reset(); setView({ kind: "confirm", action: "disable" }); }} className="admin-btn admin-btn--danger">Turn off</button>
          </div>
        </div>
      )}

      {view.kind === "setup" && (
        <div className="admin-steps">
          <div>
            <p className="admin-steps__n">1</p>
            <p className="text-sm">Scan this code with your authenticator app.</p>
            {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, nothing to optimise */}
            <img src={view.qr} width={220} height={220} alt={`QR code to add Kero Amir (${email}) to an authenticator app`} className="admin-qr" />
            <p className="text-xs text-muted">Can&apos;t scan? Enter this key instead:</p>
            <code className="admin-key">{view.setup.sharedKey.match(/.{1,4}/g)?.join(" ")}</code>
          </div>
          <CodeForm step="2" label="Enter the 6-digit code the app shows" code={code} setCode={setCode} busy={busy} onSubmit={submit}
            submitLabel="Turn on" onCancel={finish} />
        </div>
      )}

      {view.kind === "confirm" && (
        <CodeForm label={view.action === "disable" ? "To turn off two-factor sign-in, enter a current code" : "To make new recovery codes, enter a current code"}
          code={code} setCode={setCode} busy={busy} onSubmit={submit} onCancel={finish}
          submitLabel={view.action === "disable" ? "Turn off" : "Make new codes"} danger={view.action === "disable"} />
      )}

      {view.kind === "codes" && <RecoveryCodes codes={view.codes} onDone={finish} />}

      <FormMessages messages={messages} />
    </section>
  );
}

function CodeForm({ step, label, code, setCode, busy, onSubmit, onCancel, submitLabel, danger }: {
  step?: string; label: string; code: string; setCode: (v: string) => void; busy: boolean;
  onSubmit: (e: React.FormEvent) => void; onCancel: () => void; submitLabel: string; danger?: boolean;
}) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col items-start gap-3">
      {step && <p className="admin-steps__n">{step}</p>}
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {label}
        <input value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric"
          autoComplete="one-time-code" autoFocus className="form-input w-44 font-mono text-lg tracking-[0.4em]" />
      </label>
      <div className="flex gap-2">
        <button type="submit" disabled={busy} className={`admin-btn ${danger ? "admin-btn--danger" : "admin-btn--primary"}`}>{busy ? "Checking…" : submitLabel}</button>
        <button type="button" onClick={onCancel} className="admin-btn">Cancel</button>
      </div>
    </form>
  );
}

/** Shown once. Each code signs in one time when the phone isn't available. */
function RecoveryCodes({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = `Kero Amir admin: recovery codes\nEach code works once. Keep them somewhere safe.\n\n${codes.join("\n")}\n`;

  const copy = async () => {
    await navigator.clipboard.writeText(text).catch(() => undefined);
    setCopied(true);
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "kero-amir-recovery-codes.txt" });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4">
      <div role="status" className="admin-alert">
        <strong>Save these recovery codes now.</strong> If you lose your phone, each code signs you in once. You won&apos;t see them again.
      </div>
      <ol className="admin-codes">{codes.map((c) => <li key={c}>{c}</li>)}</ol>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="admin-btn">{copied ? "Copied" : "Copy"}</button>
        <button type="button" onClick={download} className="admin-btn">Download .txt</button>
        <button type="button" onClick={onDone} className="admin-btn admin-btn--primary">I&apos;ve saved them</button>
      </div>
    </div>
  );
}
