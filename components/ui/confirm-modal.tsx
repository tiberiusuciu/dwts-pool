"use client";

import { useEffect, useId, useRef } from "react";

import { useT } from "@/components/i18n/locale-provider";

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pending = false,
  danger = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const resolvedConfirm = confirmLabel ?? t("common.confirm");
  const resolvedCancel = cancelLabel ?? t("common.cancel");

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <button
        type="button"
        aria-label={t("common.dismiss")}
        disabled={pending}
        onClick={onCancel}
        className="absolute inset-0 bg-black/55"
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl"
      >
        <h2
          id={titleId}
          className="font-display text-lg font-semibold tracking-tight"
        >
          {title}
        </h2>
        <p id={descId} className="mt-2 text-sm text-muted">
          {description}
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-background disabled:opacity-60"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className={`h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-60 ${
              danger
                ? "bg-accent hover:bg-accent-hover"
                : "bg-foreground text-surface"
            }`}
          >
            {pending ? t("common.working") : resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
