"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useT } from "@/components/i18n/locale-provider";
import { useTheme } from "@/components/theme/theme-provider";
import type { ThemePreference } from "@/lib/theme";

const ICONS: Record<ThemePreference, typeof Sun> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

const OPTIONS: { value: ThemePreference; labelKey: string }[] = [
  { value: "system", labelKey: "theme.system" },
  { value: "light", labelKey: "theme.light" },
  { value: "dark", labelKey: "theme.dark" },
];

export function ThemePicker() {
  const { preference, setPreference } = useTheme();
  const t = useT();

  return (
    <div className="space-y-3">
      <div>
        <h2 className="font-display text-xl font-semibold tracking-tight">
          {t("theme.title")}
        </h2>
        <p className="mt-2 text-sm text-muted">{t("theme.subtitle")}</p>
      </div>

      <div
        role="radiogroup"
        aria-label={t("theme.aria")}
        className="grid grid-cols-3 gap-2"
      >
        {OPTIONS.map(({ value, labelKey }) => {
          const Icon = ICONS[value];
          const selected = preference === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setPreference(value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-background text-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" aria-hidden />
              {t(labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
