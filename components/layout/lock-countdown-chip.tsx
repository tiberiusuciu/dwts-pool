"use client";

import Link from "next/link";
import { Lock, Timer } from "lucide-react";

import { usePredictionLock } from "@/hooks/use-prediction-lock";

export type LockClockProps = {
  lockAtIso: string;
  forceLocked?: boolean;
};

export function LockCountdownChip({
  lockAtIso,
  forceLocked = false,
}: LockClockProps) {
  const { locked, label, urgent } = usePredictionLock(lockAtIso, forceLocked);

  const tone = locked
    ? "border-border bg-background/70 text-muted"
    : urgent
      ? "border-accent/60 bg-accent-soft text-accent shadow-[0_0_14px_color-mix(in_srgb,var(--accent)_40%,transparent)]"
      : "border-border bg-background/70 text-foreground";

  return (
    <Link
      href="/"
      transitionTypes={["nav-back"]}
      className={`inline-flex max-w-[11.5rem] items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-semibold tabular-nums transition-colors sm:max-w-none ${tone}`}
      aria-label={
        locked
          ? "Predictions locked. Open home."
          : `Predictions lock in ${label}. Open home.`
      }
      title={locked ? "Predictions locked" : `Locks in ${label}`}
    >
      {locked ? (
        <Lock className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Timer className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="truncate">{locked ? "Locked" : label}</span>
    </Link>
  );
}
