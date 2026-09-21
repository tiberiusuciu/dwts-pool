"use client";

import { useT } from "@/components/i18n/locale-provider";

export function PredictEmpty() {
  const t = useT();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t("predict.title")}
      </h1>
      <p className="mt-3 text-sm text-muted">{t("predict.empty")}</p>
    </div>
  );
}
