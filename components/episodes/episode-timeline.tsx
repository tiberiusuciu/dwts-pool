"use client";

import { useMemo, useState } from "react";

import type { EpisodeDTO } from "@/lib/episodes";

const STATUS_LABEL: Record<EpisodeDTO["status"], string> = {
  PAST: "Past",
  LIVE: "Live",
  UPCOMING: "Upcoming",
};

export function EpisodeTimeline({ episodes }: { episodes: EpisodeDTO[] }) {
  const defaultId = useMemo(() => {
    const past = [...episodes].reverse().find((e) => e.status === "PAST");
    return past?.id ?? episodes[0]?.id ?? "";
  }, [episodes]);

  const [selectedId, setSelectedId] = useState(defaultId);
  const selected = episodes.find((e) => e.id === selectedId) ?? episodes[0];

  if (!selected) {
    return (
      <p className="text-sm text-muted">No episodes yet. Run the season seed.</p>
    );
  }

  return (
    <section className="mt-8 space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Episode timeline
        </h2>
        <p className="mt-1 text-sm text-muted">
          Tap an episode to review judge scores.
        </p>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max snap-x snap-mandatory gap-2">
          {episodes.map((episode) => {
            const active = episode.id === selected.id;
            return (
              <button
                key={episode.id}
                type="button"
                onClick={() => setSelectedId(episode.id)}
                className={`snap-start rounded-2xl border px-4 py-3 text-left transition-colors active:scale-[0.98] ${
                  active
                    ? "border-accent bg-accent-soft text-foreground"
                    : "border-border bg-surface text-foreground hover:bg-background"
                }`}
              >
                <span className="block text-sm font-semibold">
                  Ep {episode.episodeNumber}
                </span>
                <span
                  className={`mt-0.5 block text-xs ${
                    active ? "text-accent" : "text-muted"
                  }`}
                >
                  {STATUS_LABEL[episode.status]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h3 className="font-display text-base font-semibold">
            {selected.title}
          </h3>
          <span className="shrink-0 text-xs text-muted">
            {STATUS_LABEL[selected.status]}
          </span>
        </div>

        {selected.status === "PAST" ? (
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {selected.results.map((result) => (
              <li
                key={result.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {result.couple.celebrityName}
                  </p>
                  <p className="truncate text-xs text-muted">
                    & {result.couple.proName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {result.isEliminated ? (
                    <span className="rounded-md bg-accent-soft px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                      Eliminated
                    </span>
                  ) : null}
                  <span className="tabular-nums text-sm font-semibold">
                    {result.judgeScore ?? "—"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
            Scores unlock after the episode.
          </p>
        )}
      </div>
    </section>
  );
}
