import { isLocale, type Locale } from "@/lib/i18n/types";

export const LOCALE_STORAGE_KEY = "dwts-locale";

export function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

export function detectBrowserLocale(): Locale {
  if (typeof window === "undefined") return "en";
  try {
    const lang = window.navigator.language?.toLowerCase() ?? "";
    if (lang.startsWith("fr")) return "fr";
  } catch {
    /* ignore */
  }
  return "en";
}

export function resolveInitialLocale(): Locale {
  return readStoredLocale() ?? detectBrowserLocale();
}

export function applyDocumentLang(locale: Locale) {
  document.documentElement.lang = locale;
}

export function intlLocale(locale: Locale): string {
  return locale === "fr" ? "fr-CA" : "en-CA";
}
