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
import { CoupleAvatar } from "@/components/couples/couple-avatar";
import { useT } from "@/components/i18n/locale-provider";
import { SCORE_DEFAULT, SCORE_MAX, SCORE_MIN } from "@/lib/scores";

type EpisodeStatusValue = "PAST" | "LIVE" | "UPCOMING";

type CoupleRow = {
  id: string;
  celebrityName: string;
  proName: string;
  imageUrl: string | null;
  proImageUrl: string | null;
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
  const t = useT();
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
      setMessage(t("admin.savedCouple", { name: row.celebrityName }));
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
      setMessage(t("admin.markedStatus", { status }));
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
      setMessage(next ? t("admin.markedFinale") : t("admin.finaleCleared"));
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
      setMessage(
        t("admin.pointsCalculated", { count: result.totals ?? 0 }),
      );
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
      setMessage(t("admin.resultsCleared"));
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-6">
        <div>
          <h2 className="font-display text-lg font-semibold">
            {t("admin.liveTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("admin.liveSubtitle")}</p>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="block min-w-[12rem] flex-1 space-y-1.5">
            <span className="text-sm font-medium">{t("admin.episode")}</span>
            <select
              value={episodeId}
              onChange={(e) => onEpisodeChange(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm"
            >
              {episodes.map((ep) => (
                <option key={ep.id} value={ep.id}>
                  {ep.isFinale
                    ? t("admin.episodeOptionFinale", {
                        number: ep.episodeNumber,
                        title: ep.title,
                        status: ep.status,
                      })
                    : t("admin.episodeOption", {
                        number: ep.episodeNumber,
                        title: ep.title,
                        status: ep.status,
                      })}
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
              {t("admin.goLive")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus("PAST")}
              className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface disabled:opacity-60"
            >
              {t("admin.markPast")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setStatus("UPCOMING")}
              className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface disabled:opacity-60"
            >
              {t("admin.upcoming")}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">
            {t("admin.status")}{" "}
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
              {t("admin.seasonFinale")}
            </label>
            <button
              type="button"
              disabled={pending || !hasSavedResults}
              onClick={clearResults}
              className="h-9 rounded-xl border border-border px-3 text-xs font-medium text-muted hover:border-accent hover:text-accent disabled:opacity-60"
            >
              {t("admin.clearResults")}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <CoupleAvatar
                  celebrityName={row.celebrityName}
                  proName={row.proName}
                  imageUrl={row.imageUrl}
                  proImageUrl={row.proImageUrl}
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {row.celebrityName}
                  </p>
                  <p className="truncate text-xs text-muted">& {row.proName}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  aria-label={t("admin.decreaseAria", {
                    name: row.celebrityName,
                  })}
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
                  aria-label={t("admin.increaseAria", {
                    name: row.celebrityName,
                  })}
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
                  {t("admin.elim")}
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => saveRow(row.id)}
                  className="h-11 rounded-xl bg-foreground px-3 text-sm font-medium text-surface disabled:opacity-60"
                >
                  {t("admin.save")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h2 className="font-display text-lg font-semibold">
          {t("admin.calculateTitle")}
        </h2>
        <p className="text-sm text-muted">{t("admin.calculateSubtitle")}</p>
        <button
          type="button"
          disabled={pending}
          onClick={calculatePoints}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 sm:w-auto sm:px-6"
        >
          {pending ? t("admin.working") : t("admin.calculateCta")}
        </button>
      </section>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <ConfirmModal
        open={clearOpen}
        title={t("admin.clearModalTitle")}
        description={
          episode
            ? t("admin.clearModalDesc", {
                number: episode.episodeNumber,
                title: episode.title,
              })
            : t("admin.clearModalDescFallback")
        }
        confirmLabel={t("admin.clearConfirm")}
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
