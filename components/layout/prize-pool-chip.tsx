"use client";

import { Banknote } from "lucide-react";

import { useLocale, useT } from "@/components/i18n/locale-provider";
import { formatPrizePool } from "@/lib/prize-pool";

export function PrizePoolChip({ cents }: { cents: number }) {
  const t = useT();
  const { locale } = useLocale();
  const label = formatPrizePool(cents, locale);

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-gold/40 bg-gold-soft px-2 py-1 text-[11px] font-semibold tabular-nums text-gold sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs"
      aria-label={t("prize.poolAria", { label })}
      title={t("prize.poolAria", { label })}
    >
      <Banknote className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
