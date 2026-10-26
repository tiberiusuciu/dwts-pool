"use client";

import { useEffect } from "react";

export function Toast({
  message,
  onDismiss,
  durationMs = 3000,
}: {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(timer);
  }, [message, durationMs, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-1/2 z-[60] w-[min(92vw,24rem)] -translate-x-1/2 rounded-xl border border-border bg-foreground px-4 py-3 text-sm font-medium text-surface shadow-lg"
    >
      {message}
    </div>
  );
}
