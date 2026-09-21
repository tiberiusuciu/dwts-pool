"use client";

import { useEffect, useState } from "react";

import {
  formatLockCountdownFromMs,
  isLockUrgent,
} from "@/lib/prediction-lock";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * Live lock + countdown for prediction UIs and the header clock.
 * `forceLocked` covers non-UPCOMING episode status from the server.
 */
export function usePredictionLock(
  lockAtIso: string | null | undefined,
  forceLocked = false,
) {
  const lockAtMs =
    lockAtIso != null && lockAtIso !== "" ? Date.parse(lockAtIso) : Number.NaN;
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (forceLocked || Number.isNaN(lockAtMs)) return;

    const sync = () => setNowMs(Date.now());
    sync();

    const remaining = lockAtMs - Date.now();
    if (remaining <= 0) return;

    const timeoutId = window.setTimeout(sync, remaining + 50);
    let intervalId = window.setInterval(
      sync,
      remaining <= DAY ? 1_000 : 60_000,
    );

    // When still >24h away, switch to 1s ticks as we enter the final day
    let switchId: number | undefined;
    if (remaining > DAY) {
      switchId = window.setTimeout(() => {
        window.clearInterval(intervalId);
        intervalId = window.setInterval(sync, 1_000);
      }, remaining - DAY);
    }

    return () => {
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      if (switchId != null) window.clearTimeout(switchId);
    };
  }, [forceLocked, lockAtMs]);

  const locked =
    forceLocked || Number.isNaN(lockAtMs) || nowMs >= lockAtMs;
  const remainingMs = Number.isNaN(lockAtMs)
    ? 0
    : Math.max(0, lockAtMs - nowMs);
  const label = locked
    ? "Locked"
    : formatLockCountdownFromMs(lockAtMs, nowMs);
  const urgent = !locked && isLockUrgent(lockAtMs, nowMs);

  return { locked, label, remainingMs, urgent };
}
