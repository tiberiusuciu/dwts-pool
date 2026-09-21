"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import type { LeaderboardEntry } from "@/lib/scoring";

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-gold-soft text-sm font-bold text-gold">
        1
      </span>
    );
  }
  if (rank === 2) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-background text-sm font-bold text-muted">
        2
      </span>
    );
  }
  if (rank === 3) {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
        3
      </span>
    );
  }
  return (
    <span className="flex size-8 items-center justify-center text-sm font-semibold text-muted">
      {rank}
    </span>
  );
}

export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | undefined;

    try {
      source = new EventSource("/api/live/stream?scope=leaderboard");
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string };
          if (payload.type === "leaderboard") {
            router.refresh();
          }
        } catch {
          /* ignore */
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (!pollTimer) {
          pollTimer = setInterval(() => router.refresh(), 15_000);
        }
      };
    } catch {
      pollTimer = setInterval(() => router.refresh(), 15_000);
    }

    return () => {
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [router]);

  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted">
        No players yet. Calculate points after results are in.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((entry) => {
        const open = openId === entry.userId;
        return (
          <li
            key={entry.userId}
            className="overflow-hidden rounded-2xl border border-border bg-surface"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : entry.userId)}
              className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-background"
            >
              <RankBadge rank={entry.rank} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {entry.displayName}
              </span>
              <span className="tabular-nums text-sm font-semibold">
                {entry.totalPoints}
                <span className="ml-1 text-xs font-normal text-muted">pts</span>
              </span>
            </button>

            {open ? (
              <div className="space-y-4 border-t border-border bg-background/60 px-3 py-3">
                {entry.episodes.length === 0 ? (
                  <p className="text-xs text-muted">No scored episodes yet.</p>
                ) : (
                  entry.episodes.map((ep) => (
                    <div key={ep.episodeId} className="space-y-2">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-semibold">
                          Ep {ep.episodeNumber} · {ep.title}
                        </p>
                        <p className="text-xs tabular-nums text-muted">
                          +{ep.total} pts
                        </p>
                      </div>
                      <p className="text-xs text-muted">
                        Elim {ep.elimPts > 0 ? `+${ep.elimPts}` : "0"}
                        {ep.seasonPts > 0
                          ? ` · Season +${ep.seasonPts}`
                          : ""}
                        {` · Ranks +${ep.rankPts}`}
                      </p>
                      {ep.ranks.length > 0 ? (
                        <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                          {ep.ranks.map((s) => (
                            <li
                              key={s.coupleId}
                              className="rounded-lg bg-surface px-2 py-1.5 text-xs"
                            >
                              <span className="block truncate font-medium">
                                {s.celebrityName}
                              </span>
                              <span className="tabular-nums text-muted">
                                #{s.predictedRank ?? "—"} → #
                                {s.actualRank ?? "—"}
                                {s.points > 0 ? ` · +${s.points}` : ""}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
