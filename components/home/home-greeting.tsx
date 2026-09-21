"use client";

import { useT } from "@/components/i18n/locale-provider";

export function HomeGreeting({
  displayName,
  isLive,
}: {
  displayName: string | null | undefined;
  isLive: boolean;
}) {
  const t = useT();
  const name = displayName?.trim() || t("home.greetingFallbackName");

  return (
    <>
      <p className="font-display text-sm font-medium uppercase tracking-[0.14em] text-accent">
        {t("home.brand")}
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
        {t("home.greeting", { name })}
      </h1>
      <p className="mt-3 max-w-md text-muted">
        {isLive ? t("home.taglineLive") : t("home.taglineOpen")}
      </p>
    </>
  );
}
