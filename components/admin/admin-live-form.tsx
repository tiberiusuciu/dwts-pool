"use client";

import { Minus, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

import {
  calculateAndBroadcastPoints,
  clearEpisodeResults,
  setEpisodeFinale,
  setEpisodeStatus,
  upsertLiveResult,
} from "@/app/(app)/admin/live/actions";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { SCORE_DEFAULT, SCORE_MAX, SCORE_MIN } from "@/lib/predictions";

type EpisodeStatusValue = "PAST" | "LIVE" | "UPCOMING";

type CoupleRow = {
  id: string;
  celebrityName: string;
  proName: string;
  judgeScore: number | null;
  isEliminated: boolean;
};

type EpisodeOption = {
  id: string;
  episodeNumber: number;
  title: string;
  status: EpisodeStatusValue;
  isFinale: boolean;
};

export function AdminLiveForm({
  episodes,
  initialEpisodeId,
  couples,
}: {
  episodes: EpisodeOption[];
  initialEpisodeId: string;
  couples: CoupleRow[];
}) {
  const router = useRouter();
  const [episodeId, setEpisodeId] = useState(initialEpisodeId);
  const [rows, setRows] = useState(couples);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [clearOpen, setClearOpen] = useState(false);

  const episode = episodes.find((e) => e.id === episodeId);
  const [isFinale, setIsFinale] = useState(episode?.isFinale ?? false);
  const hasSavedResults = useMemo(
    () => couples.some((c) => c.judgeScore != null || c.isEliminated),
    [couples],
  );

  function onEpisodeChange(nextId: string) {
    setEpisodeId(nextId);
    const next = episodes.find((e) => e.id === nextId);
    setIsFinale(next?.isFinale ?? false);
    router.push(`/admin?episodeId=${nextId}`);
  }

  function bump(coupleId: string, delta: number) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== coupleId) return row;
        const current = row.judgeScore ?? SCORE_DEFAULT;
        const next = Math.min(SCORE_MAX, Math.max(SCORE_MIN, current + delta));
        return { ...row, judgeScore: next };
      }),
    );
  }

  function toggleElim(coupleId: string) {
    setRows((prev) =>
      prev.map((row) =>
        row.id === coupleId ? { ...row, isEliminated: !row.isEliminated } : row,
      ),
    );
  }

  function saveRow(coupleId: string) {
    const row = rows.find((r) => r.id === coupleId);
    if (!row) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await upsertLiveResult({
        episodeId,
        coupleId,
        judgeScore: row.judgeScore ?? SCORE_DEFAULT,
        isEliminated: row.isEliminated,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Saved ${row.celebrityName}`);
      router.refresh();
    });
  }

  function setStatus(status: EpisodeStatusValue) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setEpisodeStatus(episodeId, status);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Episode marked ${status}`);
      router.refresh();
    });
  }

  function toggleFinale(next: boolean) {
    setIsFinale(next);
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await setEpisodeFinale(episodeId, next);
      if (!result.ok) {
        setError(result.error);
        setIsFinale(!next);
        return;
      }
      setMessage(next ? "Marked as season finale" : "Finale flag cleared");
      router.refresh();
    });
  }

  function calculatePoints() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await calculateAndBroadcastPoints();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Points calculated for ${result.totals ?? 0} players`);
      router.refresh();
    });
  }

  function clearResults() {
    setClearOpen(true);
  }

  function confirmClearResults() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await clearEpisodeResults(episodeId);
      if (!result.ok) {
        setError(result.error);
        setClearOpen(false);
        return;
      }
      setRows((prev) =>
        prev.map((row) => ({
          ...row,
          judgeScore: null,
          isEliminated: false,
        })),
      );
      setClearOpen(false);
      setMessage("Episode results cleared");
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-lg font-semibold">Live results</h2>
          <p className="mt-1 text-sm text-muted">
            Enter scores during the broadcast, then calculate pool points.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] flex-1 space-y-1.5">
            <span className="text-sm font-medium">Episode</span>
            <select
              value={episodeId}
              onChange={(e) => onEpisodeChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  Ep {ep.episodeNumber} — {ep.title} ({ep.status}
                  {ep.isFinale ? ", finale" : ""})
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus("LIVE")}
              className="h-11 rounded-xl bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
            >
              Go live
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus("PAST")}
              className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface disabled:opacity-60"
            >
              Mark past
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus("UPCOMING")}
              className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface disabled:opacity-60"
            >
              Upcoming
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            Status:{" "}
            <span className="font-medium text-foreground">
              {episode?.status ?? "—"}
            </span>
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={isFinale}
                disabled={pending}
                onChange={(e) => toggleFinale(e.target.checked)}
                className="size-4 accent-[var(--accent)]"
              />
              Season finale
            </label>
            <button
              type="button"
              disabled={pending || !hasSavedResults}
              onClick={clearResults}
              className="h-9 rounded-xl border border-border px-3 text-xs font-medium text-muted hover:border-accent hover:text-accent disabled:opacity-60"
            >
              Clear results
            </button>
          </div>
        </div>

        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.celebrityName}</p>
                <p className="truncate text-xs text-muted">& {row.proName}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={`Decrease ${row.celebrityName}`}
                  onClick={() => bump(row.id, -1)}
                  className="flex size-11 items-center justify-center rounded-xl border border-border"
                >
                  <Minus className="size-4" />
                </button>
                <span className="w-10 text-center text-lg font-semibold tabular-nums">
                  {row.judgeScore ?? SCORE_DEFAULT}
                </span>
                <button
                  type="button"
                  aria-label={`Increase ${row.celebrityName}`}
                  onClick={() => bump(row.id, 1)}
                  className="flex size-11 items-center justify-center rounded-xl border border-border"
                >
                  <Plus className="size-4" />
                </button>
                <label className="flex items-center gap-2 text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={row.isEliminated}
                    onChange={() => toggleElim(row.id)}
                    className="size-4 accent-[var(--accent)]"
                  />
                  Elim
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => saveRow(row.id)}
                  className="h-11 rounded-xl bg-foreground px-3 text-sm font-medium text-surface disabled:opacity-60"
                >
                  Save
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">Calculate points</h2>
        <p className="text-sm text-muted">
          Recompute every player&apos;s total from past results and push a live
          leaderboard update.
        </p>
        <button
          type="button"
          disabled={pending}
          onClick={calculatePoints}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 sm:w-auto sm:px-6"
        >
          {pending ? "Working…" : "Calculate points & broadcast"}
        </button>
      </section>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <ConfirmModal
        open={clearOpen}
        title="Clear episode results?"
        description={
          episode
            ? `This removes all scores and elimination flags for Ep ${episode.episodeNumber} — ${episode.title}. Couples eliminated on this episode become active again, and pool points are recalculated.`
            : "This removes all scores and elimination flags for this episode. Couples eliminated here become active again, and pool points are recalculated."
        }
        confirmLabel="Clear results"
        danger
        pending={pending}
        onConfirm={confirmClearResults}
        onCancel={() => {
          if (!pending) setClearOpen(false);
        }}
      />
    </div>
  );
}
