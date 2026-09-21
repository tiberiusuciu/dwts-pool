import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { cookies } from "next/headers";

import { AuthSessionProvider } from "@/components/providers/session-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  isThemePreference,
  THEME_STORAGE_KEY,
  type ResolvedTheme,
} from "@/lib/theme";

import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DWTS Pool",
  description: "Private Dancing with the Stars prediction pool",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
  },
};

function resolveThemeFromCookie(
  preference: string | undefined,
): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  // system / missing — default dark to match prior server snapshot
  return "dark";
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const jar = await cookies();
  const stored = jar.get(THEME_STORAGE_KEY)?.value;
  const preference = isThemePreference(stored) ? stored : "system";
  const resolved = resolveThemeFromCookie(
    preference === "system" ? undefined : preference,
  );

  return (
    <html
      lang="en"
      data-theme={resolved}
      style={{ colorScheme: resolved }}
      suppressHydrationWarning
      className={`${dmSans.variable} ${syne.variable} min-h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <ThemeProvider>
          <LocaleProvider>
            <AuthSessionProvider>{children}</AuthSessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
