"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useT } from "@/components/i18n/locale-provider";
import type {
  EpisodeScoreBreakdown,
  LeaderboardEntry,
} from "@/lib/scoring";

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

function pts(n: number) {
  return n > 0 ? `+${n}` : String(n);
}

function EpisodeBreakdown({ ep }: { ep: EpisodeScoreBreakdown }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const elimHit = ep.elimPts > 0;

  return (
    <div className="rounded-xl border border-border/70 bg-surface/80">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left"
        aria-expanded={open}
      >
        <span className="w-7 shrink-0 text-xs font-semibold tabular-nums text-muted">
          {t("leaderboard.epAbbrev", { number: ep.episodeNumber })}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium">
          {ep.title}
        </span>
        <span className="hidden text-[11px] tabular-nums text-muted sm:inline">
          {elimHit
            ? t("leaderboard.summaryElimHit")
            : t("leaderboard.summaryElimMiss")}{" "}
          · {t("leaderboard.summaryRank", { pts: pts(ep.rankPts) })}
          {ep.seasonPts > 0
            ? ` · ${t("leaderboard.summarySeason", { pts: pts(ep.seasonPts) })}`
            : ""}
        </span>
        <span className="text-xs font-semibold tabular-nums">
          {pts(ep.total)}
        </span>
        <ChevronDown
          className={`size-3.5 shrink-0 text-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div className="space-y-2 border-t border-border/70 px-2.5 py-2">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
            <span>
              {t("leaderboard.elimPick")}{" "}
              <span
                className={
                  elimHit
                    ? "font-medium text-success"
                    : "font-medium text-foreground"
                }
              >
                {ep.predictedElimName ?? "—"}
              </span>
              {ep.actualElimNames.length > 0 ? (
                <>
                  {" "}
                  · {t("leaderboard.actual", {
                    names: ep.actualElimNames.join(", "),
                  })}
                </>
              ) : null}
              <span className="tabular-nums"> ({pts(ep.elimPts)})</span>
            </span>
            <span className="tabular-nums">
              {t("leaderboard.ranksLabel", { pts: pts(ep.rankPts) })}
            </span>
            {ep.seasonPts > 0 ? (
              <span className="tabular-nums">
                {t("leaderboard.seasonLabel", { pts: pts(ep.seasonPts) })}
              </span>
            ) : null}
          </div>

          {ep.ranks.length > 0 ? (
            <table className="w-full text-[11px]">
              <thead>
                <tr className="text-left text-muted">
                  <th className="pb-1 font-medium">
                    {t("leaderboard.colCouple")}
                  </th>
                  <th className="pb-1 pr-2 text-right font-medium">
                    {t("leaderboard.colPred")}
                  </th>
                  <th className="pb-1 pr-2 text-right font-medium">
                    {t("leaderboard.colAct")}
                  </th>
                  <th className="pb-1 text-right font-medium">
                    {t("leaderboard.colPts")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {ep.ranks.map((row) => (
                  <tr key={row.coupleId} className="border-t border-border/50">
                    <td className="max-w-[9rem] truncate py-1 pr-2 font-medium">
                      {row.celebrityName}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums text-muted">
                      {row.predictedRank ?? "—"}
                    </td>
                    <td className="py-1 pr-2 text-right tabular-nums text-muted">
                      {row.actualRank ?? "—"}
                    </td>
                    <td className="py-1 text-right tabular-nums">
                      {pts(row.points)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-[11px] text-muted">
              {t("leaderboard.noRankPredictions")}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function LeaderboardList({ entries }: { entries: LeaderboardEntry[] }) {
  const t = useT();
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
    return <p className="text-sm text-muted">{t("leaderboard.empty")}</p>;
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
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-background"
            >
              <RankBadge rank={entry.rank} />
              <span className="min-w-0 flex-1 truncate font-medium">
                {entry.displayName}
              </span>
              <span className="tabular-nums text-sm font-semibold">
                {entry.totalPoints}
                <span className="ml-1 text-xs font-normal text-muted">
                  {t("leaderboard.pts")}
                </span>
              </span>
              <ChevronDown
                className={`size-4 shrink-0 text-muted transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            {open ? (
              <div className="space-y-1.5 border-t border-border bg-background/50 px-2.5 py-2.5">
                {entry.episodes.length === 0 ? (
                  <p className="px-1 text-xs text-muted">
                    {t("leaderboard.noScoredEpisodes")}
                  </p>
                ) : (
                  entry.episodes.map((ep) => (
                    <EpisodeBreakdown key={ep.episodeId} ep={ep} />
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
