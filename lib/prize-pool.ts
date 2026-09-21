export type PrizeContributionRow = {
  id: string;
  amountCents: number;
  userId: string | null;
  guestName: string | null;
  note: string | null;
  /** ISO string for client components. */
  createdAt: string;
  user: { id: string; displayName: string | null; email: string } | null;
};

export function formatPrizePool(cents: number): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(dollars);
}

export function parseDollarAmount(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, "");
  if (!cleaned || !/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const dollars = Number(cleaned);
  if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 1_000_000) {
    return null;
  }
  return Math.round(dollars * 100);
}

export function contributorLabel(row: {
  guestName: string | null;
  user: { displayName: string | null; email: string } | null;
}): string {
  if (row.user) {
    return row.user.displayName?.trim() || row.user.email;
  }
  return row.guestName?.trim() || "Unknown";
}
