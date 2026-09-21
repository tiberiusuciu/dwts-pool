export type Locale = "en" | "fr";

export const LOCALES: Locale[] = ["en", "fr"];

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "fr";
}
