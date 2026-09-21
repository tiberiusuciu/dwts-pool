"use client";

import { useT } from "@/components/i18n/locale-provider";

export function LeaderboardHeader() {
  const t = useT();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t("leaderboard.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">{t("leaderboard.subtitle")}</p>
    </div>
  );
}
