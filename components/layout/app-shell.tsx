"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crown, Home, Settings, Trophy } from "lucide-react";

import { useT } from "@/components/i18n/locale-provider";
import { DiscoBall } from "@/components/layout/disco-ball";
import {
  LockCountdownChip,
  type LockClockProps,
} from "@/components/layout/lock-countdown-chip";
import { PrizePoolChip } from "@/components/layout/prize-pool-chip";

const NAV = [
  { href: "/", labelKey: "nav.home", icon: Home },
  { href: "/predict", labelKey: "nav.winner", icon: Crown },
  { href: "/leaderboard", labelKey: "nav.ranks", icon: Trophy },
  { href: "/settings", labelKey: "nav.settings", icon: Settings },
] as const;

function navIndex(pathname: string) {
  const exact = NAV.findIndex((item) => item.href === pathname);
  if (exact >= 0) return exact;
  return NAV.findIndex(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );
}

function StandingChip({
  standing,
}: {
  standing: { rank: number; totalPoints: number } | null;
}) {
  const t = useT();
  if (!standing) return null;
  return (
    <Link
      href="/leaderboard"
      transitionTypes={["nav-forward"]}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-background/70 px-2 py-1 text-[11px] font-medium tabular-nums transition-colors hover:border-accent/50 hover:text-accent sm:gap-2 sm:px-3 sm:py-1.5 sm:text-xs"
      aria-label={t("nav.standingAria", {
        rank: standing.rank,
        points: standing.totalPoints,
      })}
    >
      <span className="text-accent">#{standing.rank}</span>
      <span className="hidden text-muted sm:inline">·</span>
      <span className="hidden sm:inline">
        {standing.totalPoints}
        <span className="ml-0.5 text-muted">{t("nav.pts")}</span>
      </span>
    </Link>
  );
}

export function AppShell({
  children,
  standing,
  lockClock,
  prizePoolCents,
}: {
  children: React.ReactNode;
  standing: { rank: number; totalPoints: number } | null;
  lockClock: LockClockProps | null;
  prizePoolCents: number;
}) {
  const pathname = usePathname();
  const current = navIndex(pathname);
  const t = useT();

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header
        className="z-40 shrink-0 border-b border-border bg-surface/90 backdrop-blur-md"
        style={{ viewTransitionName: "site-header" }}
      >
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-3 md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-3 md:px-6">
          <Link
            href="/"
            transitionTypes={["nav-back"]}
            aria-label={t("nav.brand")}
            className="inline-flex shrink-0 items-center gap-2 font-display text-lg font-semibold tracking-tight md:justify-self-start"
          >
            <DiscoBall className="shrink-0" />
            <span className="hidden whitespace-nowrap sm:inline">
              {t("nav.brand")}
            </span>
          </Link>

          <nav className="hidden items-center gap-1 justify-self-center md:flex">
            {NAV.map(({ href, labelKey, icon: Icon }, index) => {
              const active = pathname === href;
              const types =
                index >= current ? ["nav-forward"] : ["nav-back"];
              return (
                <Link
                  key={href}
                  href={href}
                  transitionTypes={types}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-background hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" strokeWidth={active ? 2.25 : 1.75} />
                  {t(labelKey)}
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-1 sm:gap-1.5 md:flex-initial md:justify-self-end md:gap-2">
            <PrizePoolChip cents={prizePoolCents} />
            {lockClock ? <LockCountdownChip {...lockClock} /> : null}
            <StandingChip standing={standing} />
          </div>
        </div>
      </header>

      {/* Scroll here so the header never shifts when the scrollbar appears */}
      <main className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-4 pb-24 pt-6 md:px-6 md:pb-10 md:pt-8">
          {children}
        </div>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur-md md:hidden"
        style={{ viewTransitionName: "site-tabbar" }}
      >
        <div className="mx-auto flex h-16 max-w-lg items-stretch justify-around px-2">
          {NAV.map(({ href, labelKey, icon: Icon }, index) => {
            const active = pathname === href;
            const types =
              index >= current ? ["nav-forward"] : ["nav-back"];
            return (
              <Link
                key={href}
                href={href}
                transitionTypes={types}
                className={`flex min-w-[4.5rem] flex-col items-center justify-center gap-0.5 text-xs ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon className="size-5" strokeWidth={active ? 2.25 : 1.75} />
                <span className={active ? "font-medium" : ""}>{t(labelKey)}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
