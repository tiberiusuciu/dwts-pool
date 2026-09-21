"use client";

import { useT } from "@/components/i18n/locale-provider";

export function AdminHeader({ empty = false }: { empty?: boolean }) {
  const t = useT();

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">
        {t("admin.title")}
      </h1>
      <p className="mt-1 text-sm text-muted">
        {empty ? t("admin.noEpisodes") : t("admin.subtitle")}
      </p>
    </div>
  );
}
