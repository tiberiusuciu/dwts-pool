import { Banknote } from "lucide-react";

import { formatPrizePool } from "@/lib/app-settings";

export function PrizePoolChip({ cents }: { cents: number }) {
  const label = formatPrizePool(cents);

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold-soft px-2.5 py-1.5 text-xs font-semibold tabular-nums text-gold"
      aria-label={`Prize pool ${label}`}
      title={`Prize pool ${label}`}
    >
      <Banknote className="size-3.5 shrink-0" aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  );
}
