"use client";

import { useState, useTransition } from "react";

import { updatePrizePool } from "@/app/(app)/admin/settings-actions";
import { formatPrizePool } from "@/lib/app-settings";

export function PrizePoolForm({
  initialCents,
}: {
  initialCents: number;
}) {
  const [value, setValue] = useState(() =>
    (initialCents / 100).toFixed(initialCents % 100 === 0 ? 0 : 2),
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePrizePool(value);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const cleaned = value.trim().replace(/[$,\s]/g, "");
      const cents = Math.round(Number(cleaned) * 100);
      setMessage(`Prize pool set to ${formatPrizePool(cents)}`);
    });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Prize pool
        </h2>
        <p className="mt-1 text-sm text-muted">
          Shown to everyone in the header. Update as buy-ins come in.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="block min-w-0 flex-1 space-y-1.5">
          <span className="text-xs font-medium text-muted">Amount (CAD)</span>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
              $
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="0"
              className="h-12 w-full rounded-xl border border-border bg-background py-2 pl-7 pr-3 text-base tabular-nums outline-none ring-accent focus:ring-2"
            />
          </div>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 shrink-0 items-center justify-center rounded-xl bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save pool"}
        </button>
      </form>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </section>
  );
}
