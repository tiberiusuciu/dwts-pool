"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Radio, Settings, Trophy, Vote } from "lucide-react";

const NAV = [
  { href: "/", label: "Home", icon: Home },
  { href: "/predict", label: "Predict", icon: Vote },
  { href: "/live", label: "Live", icon: Radio },
  { href: "/leaderboard", label: "Board", icon: Trophy },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-40 hidden border-b border-border bg-surface/90 backdrop-blur-md md:block">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="font-display text-lg font-semibold tracking-tight">
            DWTS Pool
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-24 pt-6 md:px-6 md:pb-10 md:pt-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden">
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-w-[4.5rem] flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className={active ? "font-medium" : ""}>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
