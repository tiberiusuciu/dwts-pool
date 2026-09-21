"use client";

import { useMemo, useState } from "react";

import { useLiveEpisode } from "@/components/live/use-live-episode";
import {
  computeHighlights,
  type BreakdownCouple,
  type BreakdownDTO,
  type BreakdownPlayer,
} from "@/lib/live-breakdown";
import type { LiveEpisodePayload, LiveResultRow } from "@/lib/live-bus";

export function PredictionBreakdown({ initial }: { initial: BreakdownDTO }) {
  const [status, setStatus] = useState(initial.episode.status);
  const [results, setResults] = useState<LiveResultRow[]>(initial.results);
  const [pulseIds, setPulseIds] = useState<Set<string>>(new Set());

  const players: BreakdownPlayer[] = useMemo(() => {
    return computeHighlights(
      initial.players.map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        eliminatedCoupleId: p.eliminatedCoupleId,
        ranks: p.ranks,
      })),
      results,
      initial.couples,
    );
  }, [initial.players, initial.couples, results]);

  const resultByCouple = useMemo(() => {
    return new Map(results.map((r) => [r.coupleId, r]));
  }, [results]);

  const actualRanks = useMemo(() => {
    const scored = results
      .filter((r) => r.judgeScore != null)
      .sort((a, b) => {
        const diff = (b.judgeScore ?? 0) - (a.judgeScore ?? 0);
        if (diff !== 0) return diff;
        const an =
          initial.couples.find((c) => c.id === a.coupleId)?.celebrityName ?? "";
        const bn =
          initial.couples.find((c) => c.id === b.coupleId)?.celebrityName ?? "";
        return an.localeCompare(bn);
      });
    return new Map(scored.map((r, i) => [r.coupleId, i + 1] as const));
  }, [results, initial.couples]);

  const boardCouples = useMemo(() => {
    return [...initial.couples].sort((a, b) => {
      const ar = actualRanks.get(a.id);
      const br = actualRanks.get(b.id);
      if (ar != null && br != null) return ar - br;
      if (ar != null) return -1;
      if (br != null) return 1;
      return a.celebrityName.localeCompare(b.celebrityName);
    });
  }, [initial.couples, actualRanks]);

  const coupleById = useMemo(() => {
    const map = new Map<string, BreakdownCouple>();
    for (const c of initial.couples) map.set(c.id, c);
    return map;
  }, [initial.couples]);

  const { connected } = useLiveEpisode(
    initial.episode.id,
    (payload: LiveEpisodePayload) => {
      setStatus(payload.status);
      setResults((prev) => {
        const changed = new Set<string>();
        for (const next of payload.results) {
          const old = prev.find((r) => r.coupleId === next.coupleId);
          if (
            !old ||
            old.judgeScore !== next.judgeScore ||
            old.isEliminated !== next.isEliminated
          ) {
            changed.add(next.coupleId);
          }
        }
        if (changed.size > 0) {
          setPulseIds(changed);
          window.setTimeout(() => setPulseIds(new Set()), 700);
        }
        return payload.results;
      });
    },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
            Episode {initial.episode.episodeNumber} · {status}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight">
            {initial.episode.title}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {status === "LIVE"
              ? "Predictions locked — official scores update as the show airs."
              : "Final results vs pool rank predictions."}
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
            connected
              ? "bg-success-soft text-success"
              : "bg-background text-muted"
          }`}
        >
          {connected ? "Connected" : "Polling"}
        </span>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold">Official board</h2>
        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {boardCouples.map((couple) => {
            const result = resultByCouple.get(couple.id);
            const rank = actualRanks.get(couple.id);
            const pulsing = pulseIds.has(couple.id);
            return (
              <li
                key={couple.id}
                className={`flex items-center justify-between gap-3 px-4 py-3 transition-colors duration-500 ${
                  pulsing ? "bg-accent-soft" : ""
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="w-6 text-center text-xs font-semibold tabular-nums text-muted">
                    {rank ?? "—"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {couple.celebrityName}
                    </p>
                    <p className="truncate text-xs text-muted">
                      & {couple.proName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result?.isEliminated ? (
                    <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                      Eliminated
                    </span>
                  ) : null}
                  <span className="tabular-nums text-sm font-semibold">
                    {result?.judgeScore ?? "—"}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Player rankings</h2>
        {players.length === 0 ? (
          <p className="text-sm text-muted">No players have predictions yet.</p>
        ) : (
          <ul className="space-y-3">
            {players.map((player) => (
              <li
                key={player.userId}
                className={`rounded-2xl border px-4 py-3 transition-colors duration-500 ${
                  player.isRankLeader
                    ? "border-gold bg-gold-soft"
                    : player.elimCorrect
                      ? "border-success/40 bg-success-soft"
                      : "border-border bg-surface"
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{player.displayName}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {player.elimCorrect ? (
                      <span className="rounded-md bg-success-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-success">
                        Elim pick
                      </span>
                    ) : null}
                    {player.isRankLeader ? (
                      <span className="rounded-md bg-gold-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gold">
                        {player.rankDistance === 0
                          ? "Perfect order"
                          : "Best ranks"}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Elim pick:{" "}
                  {player.eliminatedCoupleId
                    ? (coupleById.get(player.eliminatedCoupleId)
                        ?.celebrityName ?? "—")
                    : "—"}
                  {player.rankDistance != null
                    ? ` · Rank distance ${player.rankDistance}`
                    : ""}
                </p>
                <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {boardCouples.map((couple) => {
                    const predicted = player.ranks[couple.id];
                    const actual = actualRanks.get(couple.id);
                    const exact =
                      predicted != null &&
                      actual != null &&
                      predicted === actual;
                    return (
                      <li
                        key={couple.id}
                        className={`rounded-lg px-2 py-1.5 text-xs transition-colors duration-500 ${
                          exact ? "bg-gold-soft text-gold" : "bg-background"
                        } ${pulseIds.has(couple.id) ? "ring-1 ring-accent/30" : ""}`}
                      >
                        <span className="block truncate font-medium text-foreground">
                          {couple.celebrityName}
                        </span>
                        <span className="tabular-nums text-muted">
                          #{predicted ?? "—"}
                          {actual != null ? ` → #${actual}` : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
