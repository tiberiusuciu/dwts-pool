import type { Metadata, Viewport } from "next";
import { DM_Sans, Syne } from "next/font/google";
import { cookies } from "next/headers";

import { AuthSessionProvider } from "@/components/providers/session-provider";
import { LocaleProvider } from "@/components/i18n/locale-provider";
import { ThemeProvider } from "@/components/theme/theme-provider";
import {
  isThemePreference,
  THEME_CHROME,
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
  applicationName: "DWTS Pool",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "DWTS Pool",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: ["/favicon.svg"],
    apple: [{ url: "/apple-icon" }],
  },
};

function resolveThemeFromCookie(
  preference: string | undefined,
): ResolvedTheme {
  if (preference === "light" || preference === "dark") return preference;
  // system / missing — default dark to match prior server snapshot
  return "dark";
}

export async function generateViewport(): Promise<Viewport> {
  const jar = await cookies();
  const stored = jar.get(THEME_STORAGE_KEY)?.value;
  const preference = isThemePreference(stored) ? stored : "system";
  const resolved = resolveThemeFromCookie(
    preference === "system" ? undefined : preference,
  );

  return {
    width: "device-width",
    initialScale: 1,
    viewportFit: "cover",
    themeColor: THEME_CHROME[resolved],
  };
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
      className={`${dmSans.variable} ${syne.variable} h-dvh antialiased`}
    >
      <body className="flex min-h-dvh flex-col font-sans">
        <ThemeProvider>
          <LocaleProvider>
            <AuthSessionProvider>{children}</AuthSessionProvider>
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
