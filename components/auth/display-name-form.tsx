"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useState } from "react";

export function DisplayNameForm({
  initialName = "",
  title,
  subtitle,
  submitLabel,
  redirectTo = "/",
}: {
  initialName?: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  redirectTo?: string;
}) {
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
      setError(data.error ?? "Could not save");
      return;
    }

    const trimmed = displayName.trim();
    await update({ displayName: trimmed });
    setPending(false);
    setSaved(true);
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-sm">
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium">Display name</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={40}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How others will see you"
            className="h-12 w-full rounded-xl border border-border bg-surface px-3 text-base outline-none ring-accent focus:ring-2"
          />
        </label>
        {error ? <p className="text-sm text-accent">{error}</p> : null}
        {saved ? <p className="text-sm text-muted">Saved</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </form>
    </div>
  );
}
