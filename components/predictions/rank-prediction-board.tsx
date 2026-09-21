"use client";

import { EpisodeStatus } from "@prisma/client";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useMemo,
  useState,
  useTransition,
  ViewTransition,
} from "react";

import { savePredictions } from "@/app/(app)/predict/actions";
import { CoupleAvatar } from "@/components/couples/couple-avatar";
import { useT } from "@/components/i18n/locale-provider";
import { usePredictionLock } from "@/hooks/use-prediction-lock";
import type { CoupleOption } from "@/lib/couple";

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

export function RankPredictionBoard({
  episodeId,
  episodeTitle,
  episodeNumber,
  lockAtIso,
  forceLocked = false,
  episodeStatus = EpisodeStatus.UPCOMING,
  couples,
  initialOrder,
  initialEliminatedCoupleId,
}: {
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  /** ISO timestamp for Tue 8pm ET lock */
  lockAtIso: string;
  /** True when episode is no longer UPCOMING */
  forceLocked?: boolean;
  episodeStatus?: EpisodeStatus;
  couples: CoupleOption[];
  /** couple ids highest → lowest */
  initialOrder: string[];
  initialEliminatedCoupleId: string | null;
}) {
  const t = useT();
  const router = useRouter();
  const { locked, label: lockLabel } = usePredictionLock(
    lockAtIso,
    forceLocked,
  );
  const isLive = episodeStatus === EpisodeStatus.LIVE;
  const statusLabel = isLive
    ? t("ranks.statusLive")
    : locked
      ? t("ranks.statusLocked")
      : t("ranks.statusUpcoming");

  const byId = useMemo(() => {
    const map = new Map(couples.map((c) => [c.id, c]));
    return map;
  }, [couples]);

  const startingOrder =
    initialOrder.length === couples.length
      ? initialOrder
      : couples.map((c) => c.id);

  const [order, setOrder] = useState(startingOrder);
  const [eliminatedCoupleId, setEliminatedCoupleId] = useState<string | null>(
    initialEliminatedCoupleId,
  );
  const [savedOrder, setSavedOrder] = useState(startingOrder);
  const [savedEliminatedCoupleId, setSavedEliminatedCoupleId] = useState<
    string | null
  >(initialEliminatedCoupleId);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startSaveTransition] = useTransition();

  const dirty =
    eliminatedCoupleId !== savedEliminatedCoupleId ||
    !sameOrder(order, savedOrder);
  const canSave = Boolean(dirty && eliminatedCoupleId && !locked && !pending);

  function move(index: number, delta: number) {
    if (locked) return;
    const next = index + delta;
    if (next < 0 || next >= order.length) return;
    startTransition(() => {
      setOrder((prev) => {
        const copy = [...prev];
        const tmp = copy[index];
        copy[index] = copy[next];
        copy[next] = tmp;
        return copy;
      });
    });
  }

  function onSave() {
    setError(null);
    setMessage(null);
    if (locked) {
      setError(t("ranks.errorLocked"));
      return;
    }
    if (!eliminatedCoupleId) {
      setError(t("ranks.errorNeedElim"));
      return;
    }
    if (!canSave) return;
    startSaveTransition(async () => {
      const result = await savePredictions({
        episodeId,
        rankOrder: order,
        eliminatedCoupleId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSavedOrder(order);
      setSavedEliminatedCoupleId(eliminatedCoupleId);
      setMessage(t("ranks.saved"));
      router.refresh();
    });
  }

  return (
    <section className="mt-8 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
            {t("ranks.episodeMeta", { number: episodeNumber, status: statusLabel })}
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight">
            {episodeTitle}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isLive
              ? t("ranks.helpLive")
              : locked
                ? t("ranks.helpLocked")
                : t("ranks.helpOpen", { lockLabel })}
          </p>
        </div>
      </div>

      {locked ? (
        <div
          role="status"
          className="flex items-start gap-3 rounded-xl border border-accent/40 bg-accent-soft px-3 py-3 text-sm text-accent"
        >
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          <div>
            <p className="font-semibold">
              {isLive ? t("ranks.bannerLiveTitle") : t("ranks.bannerLockedTitle")}
            </p>
            <p className="mt-0.5 text-accent/90">
              {isLive ? t("ranks.bannerLiveBody") : t("ranks.bannerLockedBody")}
            </p>
          </div>
        </div>
      ) : null}

      <ul
        className={`divide-y divide-border rounded-2xl border border-border bg-surface ${
          locked ? "opacity-80" : ""
        }`}
      >
        {order.map((id, index) => {
          const couple = byId.get(id);
          if (!couple) return null;
          const isElimPick = eliminatedCoupleId === id;
          return (
            <ViewTransition key={id} update="rank-row">
              <li
                className={`flex items-center gap-3 px-3 py-3 ${
                  isElimPick ? "bg-accent-soft" : ""
                }`}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold tabular-nums text-muted">
                  {index + 1}
                </span>
                <CoupleAvatar
                  celebrityName={couple.celebrityName}
                  proName={couple.proName}
                  imageUrl={couple.imageUrl}
                  proImageUrl={couple.proImageUrl}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {couple.celebrityName}
                  </p>
                  <p className="truncate text-xs text-muted">
                    & {couple.proName}
                  </p>
                </div>
                <label
                  className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${
                    locked ? "opacity-80" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="radio"
                    name="elim-pick"
                    className="size-4 accent-[var(--accent)]"
                    checked={isElimPick}
                    disabled={locked || pending}
                    onChange={() => setEliminatedCoupleId(id)}
                  />
                  {t("ranks.elim")}
                </label>
                {!locked ? (
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      aria-label={t("ranks.moveUpAria", {
                        name: couple.celebrityName,
                      })}
                      disabled={index === 0 || pending}
                      onClick={() => move(index, -1)}
                      className="flex size-11 items-center justify-center rounded-xl border border-border disabled:opacity-40"
                    >
                      <ChevronUp className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label={t("ranks.moveDownAria", {
                        name: couple.celebrityName,
                      })}
                      disabled={index === order.length - 1 || pending}
                      onClick={() => move(index, 1)}
                      className="flex size-11 items-center justify-center rounded-xl border border-border disabled:opacity-40"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </div>
                ) : null}
              </li>
            </ViewTransition>
          );
        })}
      </ul>

      {locked ? null : (
        <button
          type="button"
          disabled={!canSave}
          onClick={onSave}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? t("ranks.saving") : t("ranks.save")}
        </button>
      )}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </section>
  );
}
