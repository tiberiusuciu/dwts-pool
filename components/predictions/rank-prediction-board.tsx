"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import { savePredictions } from "@/app/(app)/predict/actions";
import type { CoupleOption } from "@/lib/predictions";

export function RankPredictionBoard({
  episodeId,
  episodeTitle,
  episodeNumber,
  locked,
  lockLabel,
  couples,
  initialOrder,
}: {
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  locked: boolean;
  lockLabel: string;
  couples: CoupleOption[];
  /** couple ids highest → lowest */
  initialOrder: string[];
}) {
  const byId = useMemo(() => {
    const map = new Map(couples.map((c) => [c.id, c]));
    return map;
  }, [couples]);

  const [order, setOrder] = useState(() => {
    if (initialOrder.length === couples.length) return initialOrder;
    return couples.map((c) => c.id);
  });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function move(index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= order.length) return;
    setOrder((prev) => {
      const copy = [...prev];
      const tmp = copy[index];
      copy[index] = copy[next];
      copy[next] = tmp;
      return copy;
    });
  }

  function onSave() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await savePredictions({
        episodeId,
        rankOrder: order,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Ranking saved");
    });
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
            Episode {episodeNumber} · Upcoming
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
            {episodeTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Rank couples highest → lowest expected score. {lockLabel}.
          </p>
        </div>
      </div>

      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {order.map((id, index) => {
          const couple = byId.get(id);
          if (!couple) return null;
          return (
            <li
              key={id}
              className="flex items-center gap-3 px-3 py-3"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold tabular-nums text-muted">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {couple.celebrityName}
                </p>
                <p className="truncate text-xs text-muted">
                  & {couple.proName}
                </p>
              </div>
              {!locked ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    aria-label={`Move ${couple.celebrityName} up`}
                    disabled={index === 0 || pending}
                    onClick={() => move(index, -1)}
                    className="flex size-11 items-center justify-center rounded-xl border border-border disabled:opacity-40"
                  >
                    <ChevronUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${couple.celebrityName} down`}
                    disabled={index === order.length - 1 || pending}
                    onClick={() => move(index, 1)}
                    className="flex size-11 items-center justify-center rounded-xl border border-border disabled:opacity-40"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {locked ? (
        <p className="rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
          Rankings locked — Tue 8pm ET has passed (or the episode is live).
        </p>
      ) : (
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save ranking"}
        </button>
      )}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </section>
  );
}
