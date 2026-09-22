"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

import { offerPrizeContribution } from "@/app/(app)/settings/prize-actions";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import {
  formatPrizePool,
  type PrizeContributionRow,
  type PrizeContributionStatus,
} from "@/lib/prize-pool";

function statusLabel(
  status: PrizeContributionStatus,
  t: ReturnType<typeof useT>,
) {
  if (status === "PENDING") return t("prize.statusPending");
  if (status === "APPROVED") return t("prize.statusApproved");
  return t("prize.statusRejected");
}

function statusClass(status: PrizeContributionStatus) {
  if (status === "PENDING") return "offer-status-pending";
  if (status === "APPROVED") return "text-success";
  return "offer-status-rejected";
}

export function PrizeOfferForm({
  poolCents,
  offers,
}: {
  poolCents: number;
  offers: PrizeContributionRow[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const dateLocale = locale === "fr" ? "fr-CA" : "en-CA";
  const totalLabel = useMemo(
    () => formatPrizePool(poolCents, locale),
    [poolCents, locale],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#prize-pool") return;
    document.getElementById("prize-pool")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  function closeForm() {
    setFormOpen(false);
    setAmount("");
    setNote("");
    setError(null);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await offerPrizeContribution({ amount, note });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      setNote("");
      setFormOpen(false);
      setMessage(t("prize.offerSent"));
    });
  }

  return (
    <section id="prize-pool" className="scroll-mt-4 space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {t("prize.settingsTitle")}
        </h2>
        <p className="mt-1 text-sm text-muted">
          {t("prize.settingsSubtitle", { label: totalLabel })}
        </p>
      </div>

      <p className="text-lg font-semibold tabular-nums text-gold">{totalLabel}</p>

      <p className="text-xs text-muted">{t("prize.settingsFootnote")}</p>

      {formOpen ? (
        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              {t("prize.amountLabel")}
            </span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-muted">
                $
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={t("prize.amountPlaceholder")}
                required
                autoFocus
                className="h-12 w-full rounded-xl border border-border bg-background py-2 pl-7 pr-3 text-base tabular-nums outline-none ring-accent focus:ring-2"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              {t("prize.note")}{" "}
              <span className="font-normal">{t("prize.optional")}</span>
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("prize.notePlaceholder")}
              maxLength={120}
              className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none ring-accent focus:ring-2"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={pending}
              className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60 sm:flex-1"
            >
              {pending ? t("prize.saving") : t("prize.offerCta")}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={closeForm}
              className="flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-medium transition-colors hover:bg-background disabled:opacity-60 sm:w-auto sm:px-5"
            >
              {t("prize.offerCancel")}
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMessage(null);
            setFormOpen(true);
          }}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-border text-sm font-medium transition-colors hover:border-accent hover:text-accent"
        >
          {t("prize.offerCta")}
        </button>
      )}

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <div className="border-t border-border pt-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          {t("prize.myOffersHeading")}
        </h3>
        {offers.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("prize.myOffersEmpty")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {offers.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className={`text-xs font-medium ${statusClass(row.status)}`}>
                    {statusLabel(row.status, t)}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {new Date(row.createdAt).toLocaleDateString(dateLocale, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                <span className="shrink-0 font-semibold tabular-nums text-gold">
                  {formatPrizePool(row.amountCents, locale)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
