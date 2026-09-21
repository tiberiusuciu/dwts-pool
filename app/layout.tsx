import type { Metadata } from "next";
import { DM_Sans, Syne } from "next/font/google";

import { AuthSessionProvider } from "@/components/providers/session-provider";

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${syne.variable} min-h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
