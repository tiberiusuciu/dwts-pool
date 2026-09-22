"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useState } from "react";

import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { PasswordInput } from "@/components/auth/password-input";
import { useT } from "@/components/i18n/locale-provider";

export function SignupForm() {
  const t = useT();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setPending(false);
      setError(data.error ?? t("auth.couldNotCreate"));
      return;
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
    setPending(false);

    if (result?.error) {
      setError(t("auth.createdButSignInFailed"));
      return;
    }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <p className="font-display text-3xl font-semibold tracking-tight">
        {t("auth.brand")}
      </p>
      <h1 className="mt-6 text-xl font-semibold">{t("auth.signupTitle")}</h1>
      <p className="mt-1 text-sm text-muted">{t("auth.signupSubtitle")}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("auth.email")}</span>
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none ring-accent focus:ring-2"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">{t("auth.password")}</span>
          <PasswordInput
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={setPassword}
          />
          <span className="text-xs text-muted">{t("auth.passwordHint")}</span>
        </label>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? t("auth.creating") : t("auth.createAccount")}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">{t("auth.or")}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      <GoogleSignInButton callbackUrl="/onboarding" />

      <p className="mt-8 text-center text-sm text-muted">
        {t("auth.hasAccount")}{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          {t("auth.signInLink")}
        </Link>
      </p>
    </div>
  );
}
