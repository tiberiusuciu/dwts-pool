"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import { savePredictions } from "@/app/(app)/predict/actions";
import type { CoupleOption } from "@/lib/predictions";
import {
  SEASON_WINNER_BASE,
  SEASON_WINNER_PER_WEEK,
  scoreSeasonWinnerPoints,
  seasonWinnerWeeksHeld,
} from "@/lib/season-scoring";

function CouplePickList({
  couples,
  value,
  disabled,
  onChange,
}: {
  couples: CoupleOption[];
  value: string | null;
  disabled: boolean;
  onChange: (id: string) => void;
}) {
  return (
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
                name="season-winner"
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
  );
}

export function PredictionForm({
  episodeId,
  episodeTitle,
  episodeNumber,
  finaleEpisodeNumber,
  locked,
  couples,
  initial,
}: {
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  /** Best-known finale / last episode # for points forecast */
  finaleEpisodeNumber: number;
  locked: boolean;
  couples: CoupleOption[];
  initial: {
    seasonWinnerCoupleId: string | null;
    seasonWinnerFromEpisodeNumber: number | null;
  };
}) {
  const router = useRouter();
  const activeIds = useMemo(
    () => new Set(couples.map((c) => c.id)),
    [couples],
  );
  const savedId =
    initial.seasonWinnerCoupleId != null &&
    activeIds.has(initial.seasonWinnerCoupleId)
      ? initial.seasonWinnerCoupleId
      : null;
  const savedFrom =
    savedId != null
      ? (initial.seasonWinnerFromEpisodeNumber ?? episodeNumber)
      : null;

  const [seasonWinnerCoupleId, setSeasonWinnerCoupleId] = useState(savedId);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pickEliminated =
    initial.seasonWinnerCoupleId != null && savedId == null;

  const dirty =
    seasonWinnerCoupleId !== savedId && seasonWinnerCoupleId != null;
  const isSwap = savedId != null && dirty;

  const fromEpisode =
    seasonWinnerCoupleId != null && seasonWinnerCoupleId === savedId && savedFrom
      ? savedFrom
      : episodeNumber;

  const forecastFinale = Math.max(finaleEpisodeNumber, episodeNumber);
  const weeksIfHeld = seasonWinnerWeeksHeld(fromEpisode, forecastFinale);
  const forecastPts = scoreSeasonWinnerPoints(fromEpisode, forecastFinale);

  const canSave = Boolean(
    dirty &&
      seasonWinnerCoupleId &&
      activeIds.has(seasonWinnerCoupleId) &&
      !locked,
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave || !seasonWinnerCoupleId) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await savePredictions({
        episodeId,
        seasonWinnerCoupleId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Season winner saved");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className={`space-y-6 ${canSave ? "pb-28" : ""}`}>
      <div>
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          Episode {episodeNumber}
        </p>
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
          Season winner
        </h1>
        <p className="mt-2 text-sm text-muted">
          {episodeTitle}. Correct pick pays {SEASON_WINNER_BASE} +{" "}
          {SEASON_WINNER_PER_WEEK} pts per week held through the finale.
        </p>
        {locked ? (
          <p className="mt-3 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-muted">
            Predictions locked (Tue 8pm ET or episode live).
          </p>
        ) : null}
      </div>

      {pickEliminated ? (
        <p className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
          Your previous pick was eliminated — choose a new winner (week bonus
          resets).
        </p>
      ) : null}

      <CouplePickList
        couples={couples}
        value={seasonWinnerCoupleId}
        disabled={locked}
        onChange={setSeasonWinnerCoupleId}
      />

      {seasonWinnerCoupleId ? (
        <div className="rounded-xl border border-border bg-surface px-4 py-3 space-y-1">
          <p className="text-sm font-medium text-foreground">
            If you&apos;re right:{" "}
            <span className="tabular-nums text-accent">{forecastPts} pts</span>
          </p>
          <p className="text-xs text-muted">
            {SEASON_WINNER_BASE} base + {SEASON_WINNER_PER_WEEK} × {weeksIfHeld}{" "}
            week{weeksIfHeld === 1 ? "" : "s"} (held Ep {fromEpisode} → Ep{" "}
            {forecastFinale}).
            {seasonWinnerCoupleId === savedId
              ? " Grows each week you keep this pick."
              : null}
          </p>
        </div>
      ) : null}

      {isSwap && !locked ? (
        <p className="rounded-xl border border-accent/40 bg-accent-soft px-3 py-2 text-sm text-accent">
          Switching couples resets your week bonus. You&apos;ll start over from
          Ep {episodeNumber} ({SEASON_WINNER_BASE} + {SEASON_WINNER_PER_WEEK}
          /week from here).
        </p>
      ) : null}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      {canSave ? (
        <div className="fixed inset-x-0 bottom-16 z-30 border-t border-border bg-surface/95 p-4 backdrop-blur-md md:bottom-0">
          <div className="mx-auto max-w-5xl md:px-6">
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
            >
              {pending
                ? "Saving…"
                : isSwap
                  ? "Confirm new winner (reset weeks)"
                  : "Save season winner"}
            </button>
          </div>
        </div>
      ) : null}
    </form>
  );
}
