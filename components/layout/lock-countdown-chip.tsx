"use client";

import Link from "next/link";
import { Lock, Timer } from "lucide-react";

import { useT } from "@/components/i18n/locale-provider";
import { usePredictionLock } from "@/hooks/use-prediction-lock";

export type LockClockProps = {
  lockAtIso: string;
  forceLocked?: boolean;
};

export function LockCountdownChip({
  lockAtIso,
  forceLocked = false,
}: LockClockProps) {
  const t = useT();
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
      className={`inline-flex max-w-[7.5rem] shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold tabular-nums transition-colors sm:max-w-none sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs ${tone}`}
      aria-label={
        locked
          ? t("lock.chipAriaLocked")
          : t("lock.chipAriaCountdown", { label })
      }
      title={
        locked
          ? t("lock.chipTitleLocked")
          : t("lock.chipTitleCountdown", { label })
      }
    >
      {locked ? (
        <Lock className="size-3.5 shrink-0" aria-hidden />
      ) : (
        <Timer className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="truncate">{locked ? t("lock.locked") : label}</span>
    </Link>
  );
}
