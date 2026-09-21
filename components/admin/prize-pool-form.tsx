"use client";

import { useMemo, useState, useTransition } from "react";

import {
  createPrizeContribution,
  deletePrizeContribution,
} from "@/app/(app)/admin/settings-actions";
import { useLocale, useT } from "@/components/i18n/locale-provider";
import {
  contributorLabel,
  formatPrizePool,
  type PrizeContributionRow,
} from "@/lib/prize-pool";

const GUEST_VALUE = "__guest__";

type PlayerOption = {
  id: string;
  displayName: string | null;
  email: string;
};

export function PrizePoolForm({
  initialCents,
  players,
  contributions,
}: {
  initialCents: number;
  players: PlayerOption[];
  contributions: PrizeContributionRow[];
}) {
  const t = useT();
  const { locale } = useLocale();
  const [amount, setAmount] = useState("");
  const [userId, setUserId] = useState(players[0]?.id ?? GUEST_VALUE);
  const [guestName, setGuestName] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isGuest = userId === GUEST_VALUE;
  const dateLocale = locale === "fr" ? "fr-CA" : "en-CA";
  const totalLabel = useMemo(
    () => formatPrizePool(initialCents, locale),
    [initialCents, locale],
  );

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await createPrizeContribution({
        amount,
        userId,
        guestName,
        note,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmount("");
      setGuestName("");
      setNote("");
      setMessage(t("prize.added"));
    });
  }

  function onRemove(id: string) {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await deletePrizeContribution(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(t("prize.removed"));
    });
  }

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-display text-lg font-semibold tracking-tight">
            {t("prize.poolTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted">{t("prize.poolSubtitle")}</p>
        </div>
        <p className="text-lg font-semibold tabular-nums text-gold">
          {totalLabel}
        </p>
      </div>

      <form onSubmit={onAdd} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
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
                className="h-12 w-full rounded-xl border border-border bg-background py-2 pl-7 pr-3 text-base tabular-nums outline-none ring-accent focus:ring-2"
              />
            </div>
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              {t("prize.contributor")}
            </span>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="h-12 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none ring-accent focus:ring-2"
            >
              {players.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.displayName ?? player.email}
                </option>
              ))}
              <option value={GUEST_VALUE}>{t("prize.guestOption")}</option>
            </select>
          </label>
        </div>

        {isGuest ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-muted">
              {t("prize.guestName")}
            </span>
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t("prize.guestNamePlaceholder")}
              required
              minLength={2}
              maxLength={80}
              className="h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none ring-accent focus:ring-2"
            />
          </label>
        ) : null}

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

        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-accent text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-60 sm:w-auto sm:px-5"
        >
          {pending ? t("prize.saving") : t("prize.add")}
        </button>
      </form>

      {error ? <p className="text-sm text-accent">{error}</p> : null}
      {message ? <p className="text-sm text-muted">{message}</p> : null}

      <div className="border-t border-border pt-3">
        <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted">
          {t("prize.contributionsHeading")}
        </h3>
        {contributions.length === 0 ? (
          <p className="mt-2 text-sm text-muted">{t("prize.empty")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border">
            {contributions.map((row) => (
              <li
                key={row.id}
                className="flex items-center gap-3 py-2.5 text-sm"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">
                    {contributorLabel(row, t("prize.unknownContributor"))}
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
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onRemove(row.id)}
                  className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted hover:bg-background hover:text-accent disabled:opacity-50"
                >
                  {t("prize.remove")}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
