"use client";

import { Banknote } from "lucide-react";
import Link from "next/link";

import { useLocale, useT } from "@/components/i18n/locale-provider";
import { formatPrizePool } from "@/lib/prize-pool";

export function PrizePoolChip({ cents }: { cents: number }) {
  const t = useT();
  const { locale } = useLocale();
  const label = formatPrizePool(cents, locale);

  return (
    <Link
      href="/settings#prize-pool"
      className="prize-pool-chip inline-flex min-w-0 max-w-[5.5rem] shrink items-center gap-1 rounded-full border border-gold/50 bg-gold-soft px-2 py-1 text-[11px] font-semibold tabular-nums text-gold transition-colors hover:border-gold hover:bg-gold-soft sm:max-w-[6.75rem] sm:gap-1.5 sm:px-2.5 sm:py-1.5 sm:text-xs xl:max-w-none xl:shrink-0"
      aria-label={t("prize.poolAria", { label })}
      title={t("prize.chipTitle", { label })}
    >
      <Banknote className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </Link>
  );
}
