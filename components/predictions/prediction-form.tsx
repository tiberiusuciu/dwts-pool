"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useState, useTransition } from "react";

import {
  savePredictions,
  type SavePredictionsResult,
} from "@/app/(app)/predict/actions";
import type { CoupleOption, UserPredictionState } from "@/lib/predictions";
import {
  SCORE_DEFAULT,
  SCORE_MAX,
  SCORE_MIN,
} from "@/lib/predictions";

type Props = {
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  locked: boolean;
  couples: CoupleOption[];
  initial: UserPredictionState;
};

function CouplePickList({
  label,
  couples,
  value,
  disabled,
  onChange,
}: {
  label: string;
  couples: CoupleOption[];
  value: string | null;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="font-display text-base font-semibold tracking-tight">
        {label}
      </legend>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
        {couples.map((couple) => {
          const selected = value === couple.id;
          return (
            <li key={couple.id}>
              <label
                className={`flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors ${
                  selected ? "bg-accent-soft" : "hover:bg-background"
                } ${disabled ? "cursor-default opacity-80" : ""}`}
              >
                <input
                  type="radio"
                  name={label}
                  className="size-4 accent-[var(--accent)]"
                  checked={selected}
                  onChange={() => onChange(couple.id)}
                  disabled={disabled}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {couple.celebrityName}
                  </span>
                  <span className="block truncate text-xs text-muted">
                    & {couple.proName}
                  </span>
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

export function PredictionForm({
  episodeId,
  episodeTitle,
  episodeNumber,
  locked,
  couples,
  initial,
}: Props) {
  const [seasonWinnerCoupleId, setSeasonWinnerCoupleId] = useState(
    initial.seasonWinnerCoupleId,
  );
  const [eliminatedCoupleId, setEliminatedCoupleId] = useState(
    initial.eliminatedCoupleId,
  );
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const next: Record<string, number> = {};
    for (const couple of couples) {
      next[couple.id] = initial.scores[couple.id] ?? SCORE_DEFAULT;
    }
    return next;
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const canSave = useMemo(() => {
    return Boolean(seasonWinnerCoupleId && eliminatedCoupleId && !locked);
  }, [seasonWinnerCoupleId, eliminatedCoupleId, locked]);

  function bumpScore(coupleId: string, delta: number) {
    setScores((prev) => {
      const current = prev[coupleId] ?? SCORE_DEFAULT;
      const next = Math.min(SCORE_MAX, Math.max(SCORE_MIN, current + delta));
      return { ...prev, [coupleId]: next };
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seasonWinnerCoupleId || !eliminatedCoupleId || locked) return;

    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result: SavePredictionsResult = await savePredictions({
        episodeId,
        seasonWinnerCoupleId,
        eliminatedCoupleId,
        scores: couples.map((c) => ({
          coupleId: c.id,
          score: scores[c.id] ?? SCORE_DEFAULT,
        })),
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Predictions saved");
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10 pb-28">
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Episode {episodeNumber}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          {episodeTitle}
        </h1>
        {locked ? (
          <p className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
            Predictions locked for this episode.
          </p>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Pick a season winner, who goes home, and each couple&apos;s score.
          </p>
        )}
      </div>

      <CouplePickList
        label="Season winner"
        couples={couples}
        value={seasonWinnerCoupleId}
        disabled={locked}
        onChange={setSeasonWinnerCoupleId}
      />

      <CouplePickList
        label="Elimination pick"
        couples={couples}
        value={eliminatedCoupleId}
        disabled={locked}
        onChange={setEliminatedCoupleId}
      />

      <section className="space-y-3">
        <h2 className="font-display text-base font-semibold tracking-tight">
          Score predictions
        </h2>
        <p className="text-xs text-muted">
          {SCORE_MIN}–{SCORE_MAX} points · tap − / +
        </p>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {couples.map((couple) => {
            const value = scores[couple.id] ?? SCORE_DEFAULT;
            return (
              <li
                key={couple.id}
                className="flex items-center justify-between gap-3 px-3 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {couple.celebrityName}
                  </p>
                  <p className="truncate text-xs text-muted">
                    & {couple.proName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    aria-label={`Decrease score for ${couple.celebrityName}`}
                    disabled={locked || value <= SCORE_MIN}
                    onClick={() => bumpScore(couple.id, -1)}
                    className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                  >
                    <Minus className="size-4" />
                  </button>
                  <span className="w-10 text-center text-lg font-semibold tabular-nums">
                    {value}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase score for ${couple.celebrityName}`}
                    disabled={locked || value >= SCORE_MAX}
                    onClick={() => bumpScore(couple.id, 1)}
                    className="flex size-11 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-colors hover:bg-surface disabled:opacity-40"
                  >
                    <Plus className="size-4" />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {!locked ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 p-4 backdrop-blur-md md:bottom-0">
          <div className="mx-auto max-w-5xl md:px-6">
            <button
              type="submit"
              disabled={!canSave || pending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save predictions"}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
