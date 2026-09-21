"use client";

import { useLocale } from "@/components/i18n/locale-provider";
import type { Locale } from "@/lib/i18n/types";

const OPTIONS: { value: Locale; labelKey: "locale.en" | "locale.fr" }[] = [
  { value: "en", labelKey: "locale.en" },
  { value: "fr", labelKey: "locale.fr" },
];

export function LocalePicker() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {t("settings.language")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("settings.languageSubtitle")}</p>
      </div>

      <div
        role="radiogroup"
        aria-label={t("locale.aria")}
        className="grid grid-cols-2 gap-2"
      >
        {OPTIONS.map(({ value, labelKey }) => {
          const selected = locale === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setLocale(value)}
              className={`flex items-center justify-center rounded-xl border px-2 py-3 text-sm font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-background text-muted hover:text-foreground"
              }`}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
