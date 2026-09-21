export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "dwts-theme";

/** Browser chrome / status bar colors (match header surface). */
export const THEME_CHROME: Record<ResolvedTheme, string> = {
  dark: "#160b36",
  light: "#ffffff",
};

export const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
}[] = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "system" || value === "light" || value === "dark";
}

export function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference === "system") return getSystemTheme();
  return preference;
}

export function readStoredThemePreference(): ThemePreference {
  if (typeof window === "undefined") return "system";
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "system";
}

function syncThemeColorMeta(resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const color = THEME_CHROME[resolved];
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }
  meta.setAttribute("content", color);
}

export function applyResolvedTheme(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
  document.documentElement.style.colorScheme = resolved;
  syncThemeColorMeta(resolved);
}

export function writeThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    /* ignore */
  }
  try {
    document.cookie = `${THEME_STORAGE_KEY}=${preference};path=/;max-age=31536000;samesite=lax`;
  } catch {
    /* ignore */
  }
}
