/** Countdown label from a lock instant (ms since epoch). */
export function formatLockCountdownFromMs(
  lockAtMs: number,
  nowMs = Date.now(),
  opts?: { lockedLabel?: string; dayUnit?: string },
): string {
  if (nowMs >= lockAtMs) return opts?.lockedLabel ?? "Locked";
  const ms = lockAtMs - nowMs;
  const totalHours = Math.floor(ms / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const dayUnit = opts?.dayUnit ?? "d";

  if (days >= 1) {
    return `${days}${dayUnit} ${totalHours % 24}h`;
  }

  const hours = totalHours;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  const secs = Math.floor((ms % 60_000) / 1000);
  return `${hours}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

export function isLockUrgent(lockAtMs: number, nowMs = Date.now()): boolean {
  const remaining = lockAtMs - nowMs;
  return remaining > 0 && remaining < 12 * 3_600_000;
}
