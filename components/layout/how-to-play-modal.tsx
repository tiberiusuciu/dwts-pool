"use client";

import { CircleHelp, Radio, Trophy, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { useT } from "@/components/i18n/locale-provider";

const BANDS = [
  { dist: "0", pts: 3, tone: "hit" as const },
  { dist: "1", pts: 2, tone: "near" as const },
  { dist: "2", pts: 1, tone: "far" as const },
  { dist: "3+", pts: 0, tone: "miss" as const },
];

export function HowToPlayModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label={t("common.dismiss")}
        onClick={onClose}
        className="how-to-backdrop absolute inset-0 bg-black/60"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="how-to-panel relative flex max-h-[min(92dvh,40rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
      >
        <div
          className="how-to-panel-glow pointer-events-none absolute inset-x-0 top-0 h-32"
          aria-hidden
        />

        <header className="relative z-10 flex shrink-0 items-start gap-3 border-b border-border/80 px-5 pb-4 pt-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
              {t("howToPlay.eyebrow")}
            </p>
            <h2
              id={titleId}
              className="mt-1 font-display text-xl font-semibold tracking-tight"
            >
              {t("howToPlay.title")}
            </h2>
            <p className="mt-1.5 text-sm text-muted">{t("howToPlay.lede")}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("common.dismiss")}
            className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-border text-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            <X className="size-4" strokeWidth={2} />
          </button>
        </header>

        <div className="relative z-10 min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5">
          <section className="space-y-2">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {t("howToPlay.predictTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {t("howToPlay.predictBody")}
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {t("howToPlay.scoringTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {t("howToPlay.scoringBody")}
            </p>

            <div className="how-to-bands grid grid-cols-4 gap-2">
              {BANDS.map((b) => (
                <div
                  key={b.dist}
                  className={`how-to-band how-to-band-${b.tone} rounded-xl border px-2 py-2.5 text-center`}
                >
                  <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                    {t("howToPlay.bandDist", { dist: b.dist })}
                  </p>
                  <p className="mt-1 font-display text-lg font-semibold tabular-nums">
                    {b.pts}
                  </p>
                  <p className="text-[10px] text-muted">{t("common.pts")}</p>
                </div>
              ))}
            </div>

            <div className="how-to-tie rounded-xl border border-border/80 bg-background/50 p-3.5">
              <p className="text-xs font-medium text-foreground">
                {t("howToPlay.tieTitle")}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                {t("howToPlay.tieBody")}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="how-to-pill how-to-pill-score rounded-full px-2.5 py-1 text-[11px] font-medium tabular-nums">
                  {t("howToPlay.tieScorePill")}
                </span>
                <span className="text-muted" aria-hidden>
                  →
                </span>
                <span className="how-to-pill how-to-pill-range rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums">
                  {t("howToPlay.tieRangePill")}
                </span>
                <span className="how-to-pill how-to-pill-hit rounded-full px-2.5 py-1 text-[11px] font-medium">
                  {t("howToPlay.tieHitPill")}
                </span>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted">
              {t("howToPlay.elimBody")}
            </p>
            <p className="text-sm leading-relaxed text-muted">
              {t("howToPlay.seasonBody")}
            </p>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {t("howToPlay.liveTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {t("howToPlay.liveBody")}
            </p>
            <div className="how-to-live flex gap-3 rounded-xl border border-border/80 bg-background/50 p-3.5">
              <div className="how-to-live-dot relative mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border border-accent/30 bg-accent-soft">
                <Radio className="size-4 text-accent" strokeWidth={2} />
                <span
                  className="how-to-live-pulse absolute inset-0 rounded-full"
                  aria-hidden
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-foreground">
                  {t("howToPlay.liveHintTitle")}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {t("howToPlay.liveHintBody")}
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-sm font-semibold tracking-tight">
              {t("howToPlay.boardTitle")}
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              {t("howToPlay.boardBody")}
            </p>
            <div className="flex items-center gap-2.5 rounded-xl border border-accent/25 bg-accent-soft/40 px-3.5 py-3">
              <Trophy className="size-4 shrink-0 text-accent" strokeWidth={2} />
              <p className="text-sm leading-snug text-foreground">
                {t("howToPlay.boardCallout")}
              </p>
            </div>
          </section>
        </div>

        <footer className="relative z-10 shrink-0 border-t border-border/80 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
          >
            {t("howToPlay.close")}
          </button>
        </footer>
      </div>
    </div>
  );
}

export function HowToPlayButton() {
  const t = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("howToPlay.openAria")}
        title={t("howToPlay.openAria")}
        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background/70 text-muted transition-colors hover:border-accent/50 hover:text-accent sm:size-9"
      >
        <CircleHelp className="size-4" strokeWidth={1.75} />
      </button>
      <HowToPlayModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
