import type { Metadata } from "next";
import { Logo } from "@/components/ui/Logo";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <main className="grid flex-1 place-items-center px-4 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo size={44} priority />
          <div>
            <p className="font-mono text-xs tracking-[0.2em] text-muted">ADMIN</p>
            <h1 className="font-display text-2xl font-semibold">Sign in</h1>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
