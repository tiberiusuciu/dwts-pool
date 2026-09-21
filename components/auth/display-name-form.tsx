"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

import { useT } from "@/components/i18n/locale-provider";

export function DisplayNameForm({
  initialName = "",
  title,
  subtitle,
  submitLabel,
  redirectTo = "/",
  className = "w-full max-w-sm",
  headingLevel = 1,
  hideFieldLabel = false,
}: {
  initialName?: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  redirectTo?: string;
  className?: string;
  headingLevel?: 1 | 2;
  hideFieldLabel?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const { update } = useSession();
  const [displayName, setDisplayName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setPending(true);

    const res = await fetch("/api/user/display-name", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };

    if (!res.ok) {
      setPending(false);
      setError(data.error ?? t("auth.couldNotSave"));
      return;
    }

    const trimmed = displayName.trim();
    await update({ displayName: trimmed });
    setPending(false);
    setSaved(true);
    router.push(redirectTo);
    router.refresh();
  }

  const Heading = headingLevel === 2 ? "h2" : "h1";

  return (
    <div className={className}>
      <Heading className="font-display text-xl font-semibold tracking-tight">
        {title}
      </Heading>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block space-y-1.5">
          <span
            className={
              hideFieldLabel ? "sr-only" : "text-sm font-medium"
            }
          >
            {t("auth.displayName")}
          </span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t("auth.displayNamePlaceholder")}
            className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none ring-accent focus:ring-2"
          />
        </label>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {saved ? <p className="text-sm text-muted">{t("auth.saved")}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? t("auth.saving") : submitLabel}
        </button>
      </form>
    </div>
  );
}
