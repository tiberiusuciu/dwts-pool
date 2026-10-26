"use client";

import { EpisodeStatus } from "@prisma/client";
import { ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  ViewTransition,
} from "react";

import { savePredictions } from "@/app/(app)/predict/actions";
import { CoupleAvatar } from "@/components/couples/couple-avatar";
import { useT } from "@/components/i18n/locale-provider";
import { Toast } from "@/components/ui/toast";
import { usePredictionLock } from "@/hooks/use-prediction-lock";
import type { CoupleOption } from "@/lib/couple";

const SAVE_DEBOUNCE_MS = 700;

function sameOrder(a: string[], b: string[]) {
  return a.length === b.length && a.every((id, i) => id === b[i]);
}

function sameIdSet(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  return a.every((id) => set.has(id));
}

export function RankPredictionBoard({
  episodeId,
  episodeTitle,
  episodeNumber,
  lockAtIso,
  forceLocked = false,
  episodeStatus = EpisodeStatus.UPCOMING,
  expectedEliminationCount = 1,
  couples,
  initialOrder,
  initialEliminatedCoupleId,
  initialEliminatedCoupleIds,
  initialPredictsNoElimination = false,
}: {
  episodeId: string;
  episodeTitle: string;
  episodeNumber: number;
  /** ISO timestamp for Tue 8pm ET lock */
  lockAtIso: string;
  /** True when episode is no longer UPCOMING */
  forceLocked?: boolean;
  episodeStatus?: EpisodeStatus;
  /** 0 = no-elim week; 1 = radio; 2+ = checkboxes */
  expectedEliminationCount?: number;
  couples: CoupleOption[];
  /** couple ids highest → lowest */
  initialOrder: string[];
  initialEliminatedCoupleId: string | null;
  initialEliminatedCoupleIds?: string[];
  initialPredictsNoElimination?: boolean;
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

  const elimSlots = Math.max(0, expectedEliminationCount);
  const multiElim = elimSlots >= 2;
  const showNoneToggle = elimSlots === 0;

  const byId = useMemo(() => {
    const map = new Map(couples.map((c) => [c.id, c]));
    return map;
  }, [couples]);

  const startingOrder =
    initialOrder.length === couples.length
      ? initialOrder
      : couples.map((c) => c.id);

  const startingElimIds = initialPredictsNoElimination
    ? []
    : initialEliminatedCoupleIds && initialEliminatedCoupleIds.length > 0
      ? initialEliminatedCoupleIds
      : initialEliminatedCoupleId
        ? [initialEliminatedCoupleId]
        : [];

  const [order, setOrder] = useState(startingOrder);
  const [eliminatedCoupleIds, setEliminatedCoupleIds] =
    useState<string[]>(startingElimIds);
  const [noElimination, setNoElimination] = useState(
    elimSlots === 0 ? initialPredictsNoElimination : false,
  );
  const [savedOrder, setSavedOrder] = useState(startingOrder);
  const [savedEliminatedCoupleIds, setSavedEliminatedCoupleIds] =
    useState<string[]>(startingElimIds);
  const [savedNoElimination, setSavedNoElimination] = useState(
    elimSlots === 0 ? initialPredictsNoElimination : false,
  );
  const [rankPickerIndex, setRankPickerIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [pending, startSaveTransition] = useTransition();

  const dismissToast = useCallback(() => setToast(null), []);

  const orderRef = useRef(order);
  const elimRef = useRef(eliminatedCoupleIds);
  const noElimRef = useRef(noElimination);
  const savedOrderRef = useRef(savedOrder);
  const savedElimRef = useRef(savedEliminatedCoupleIds);
  const savedNoElimRef = useRef(savedNoElimination);
  const lockedRef = useRef(locked);
  const saveGenRef = useRef(0);

  orderRef.current = order;
  elimRef.current = eliminatedCoupleIds;
  noElimRef.current = noElimination;
  savedOrderRef.current = savedOrder;
  savedElimRef.current = savedEliminatedCoupleIds;
  savedNoElimRef.current = savedNoElimination;
  lockedRef.current = locked;

  const dirty =
    !sameIdSet(eliminatedCoupleIds, savedEliminatedCoupleIds) ||
    noElimination !== savedNoElimination ||
    !sameOrder(order, savedOrder);

  function persist() {
    if (lockedRef.current) return;
    const rankOrder = orderRef.current;
    const elim = elimRef.current;
    const noElim = noElimRef.current;
    if (
      sameIdSet(elim, savedElimRef.current) &&
      noElim === savedNoElimRef.current &&
      sameOrder(rankOrder, savedOrderRef.current)
    ) {
      return;
    }

    const gen = ++saveGenRef.current;
    setError(null);
    startSaveTransition(async () => {
      const result = await savePredictions({
        episodeId,
        rankOrder,
        eliminatedCoupleIds: elim,
        predictsNoElimination: noElim,
      });
      if (gen !== saveGenRef.current) return;
      if (!result.ok) {
        setError(result.error);
        router.refresh();
        return;
      }
      setSavedOrder(rankOrder);
      setSavedEliminatedCoupleIds(elim);
      setSavedNoElimination(noElim);
      savedOrderRef.current = rankOrder;
      savedElimRef.current = elim;
      savedNoElimRef.current = noElim;
      setMessage(t("ranks.saved"));
      router.refresh();
    });
  }

  useEffect(() => {
    if (locked || !dirty) return;
    const timer = setTimeout(() => persist(), SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [order, eliminatedCoupleIds, noElimination, dirty, locked, episodeId]);

  useEffect(() => {
    function flush() {
      persist();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") flush();
    }
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [episodeId]);

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

  function moveTo(from: number, to: number) {
    if (locked || from === to || to < 0 || to >= order.length) return;
    startTransition(() => {
      setOrder((prev) => {
        const copy = [...prev];
        const [item] = copy.splice(from, 1);
        copy.splice(to, 0, item);
        return copy;
      });
    });
  }

  function toggleElimPick(id: string) {
    if (locked || elimSlots === 0) return;

    if (elimSlots === 1) {
      setEliminatedCoupleIds([id]);
      setNoElimination(false);
      return;
    }

    setEliminatedCoupleIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((x) => x !== id);
      }
      if (prev.length >= elimSlots) {
        setToast(
          t("ranks.elimLimitToast", {
            count: elimSlots,
          }),
        );
        return prev;
      }
      return [...prev, id];
    });
    setNoElimination(false);
  }

  const statusText = locked
    ? null
    : pending || dirty
      ? t("ranks.saving")
      : message;

  const elimHelp =
    elimSlots === 0
      ? t("ranks.elimHelpNone")
      : multiElim
        ? t("ranks.elimHelpMulti", { count: elimSlots })
        : null;

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
          {elimHelp ? (
            <p className="mt-1 text-sm font-medium text-foreground">{elimHelp}</p>
          ) : null}
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

      {showNoneToggle ? (
        <button
          type="button"
          aria-pressed={noElimination}
          disabled={locked}
          onClick={() => {
            if (noElimination) {
              setNoElimination(false);
            } else {
              setNoElimination(true);
              setEliminatedCoupleIds([]);
            }
          }}
          className={`inline-flex h-10 items-center rounded-full border px-4 text-sm font-medium transition-colors disabled:opacity-60 ${
            noElimination
              ? "border-accent bg-accent text-white"
              : "border-border bg-surface text-muted hover:text-foreground"
          }`}
        >
          {t("ranks.noElimination")}
        </button>
      ) : null}

      <ul
        className={`divide-y divide-border rounded-2xl border border-border bg-surface ${
          locked ? "opacity-80" : ""
        }`}
      >
        {order.map((id, index) => {
          const couple = byId.get(id);
          if (!couple) return null;
          const isElimPick = eliminatedCoupleIds.includes(id);
          return (
            <ViewTransition key={id} update="rank-row">
              <li
                className={`flex items-center gap-3 px-3 py-3 ${
                  isElimPick ? "bg-accent-soft" : ""
                }`}
              >
                {!locked ? (
                  <button
                    type="button"
                    aria-label={t("ranks.setRankAria", {
                      name: couple.celebrityName,
                    })}
                    aria-haspopup="dialog"
                    aria-expanded={rankPickerIndex === index}
                    onClick={() => setRankPickerIndex(index)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold tabular-nums text-muted md:hidden"
                  >
                    {index + 1}
                  </button>
                ) : null}
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full bg-background text-sm font-semibold tabular-nums text-muted ${
                    locked ? "" : "hidden md:flex"
                  }`}
                >
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
                {elimSlots > 0 ? (
                  <label
                    className={`flex shrink-0 items-center gap-1.5 text-xs font-medium ${
                      locked ? "opacity-80" : "cursor-pointer"
                    }`}
                  >
                    <input
                      type={multiElim ? "checkbox" : "radio"}
                      name={multiElim ? undefined : "elim-pick"}
                      className="size-4 accent-[var(--accent)]"
                      checked={isElimPick}
                      disabled={locked}
                      onChange={() => toggleElimPick(id)}
                    />
                    {t("ranks.elim")}
                  </label>
                ) : null}
                {!locked ? (
                  <div className="hidden shrink-0 gap-1 md:flex">
                    <button
                      type="button"
                      aria-label={t("ranks.moveUpAria", {
                        name: couple.celebrityName,
                      })}
                      disabled={index === 0}
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
                      disabled={index === order.length - 1}
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

      {rankPickerIndex != null && !locked ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-background/70 backdrop-blur-[2px]"
            aria-label={t("ranks.closeRankPicker")}
            onClick={() => setRankPickerIndex(null)}
          />
          <div
            role="dialog"
            aria-modal
            aria-label={t("ranks.pickRankTitle")}
            className="relative z-10 w-full max-w-lg rounded-t-2xl border border-border bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-lg"
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            <p className="mb-3 text-center text-sm font-medium">
              {t("ranks.pickRankTitle")}
              {byId.get(order[rankPickerIndex]) ? (
                <span className="mt-0.5 block text-xs font-normal text-muted">
                  {byId.get(order[rankPickerIndex])!.celebrityName}
                </span>
              ) : null}
            </p>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
              {order.map((_, i) => {
                const active = i === rankPickerIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      moveTo(rankPickerIndex, i);
                      setRankPickerIndex(null);
                    }}
                    className={`flex h-11 items-center justify-center rounded-xl text-sm font-semibold tabular-nums ${
                      active
                        ? "bg-accent text-white"
                        : "border border-border bg-background text-foreground"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {statusText ? (
        <p className="text-sm text-muted" role="status">
          {statusText}
        </p>
      ) : null}
      {error ? <p className="text-sm text-accent">{error}</p> : null}
      <Toast message={toast} onDismiss={dismissToast} />
    </section>
  );
}
