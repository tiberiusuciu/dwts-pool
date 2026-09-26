"use client";

import { Crown } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useT } from "@/components/i18n/locale-provider";
import { LivePulse } from "@/components/live/live-pulse";
import type { RaceChartData } from "@/lib/race-snapshots";

const PALETTE = [
  "#ff4db3",
  "#00e5ff",
  "#ffee55",
  "#7b61ff",
  "#39ff14",
  "#ff6b35",
  "#c83cd3",
  "#ffc1d1",
];

function colorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

type Props = {
  data: RaceChartData;
  /** Subscribe to leaderboard SSE for live refresh */
  live?: boolean;
};

export function RaceChart({ data, live = false }: Props) {
  const t = useT();
  const router = useRouter();
  const svgId = useId().replace(/:/g, "");
  const [flash, setFlash] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [display, setDisplay] = useState(data);
  const displayRef = useRef(data);
  const yMaxRef = useRef(seriesYMax(data));
  const rafRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const dataKey = useMemo(() => seriesKey(data), [data]);
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    displayRef.current = display;
  }, [display]);

  useEffect(() => {
    if (!live) return;
    let source: EventSource | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), 120);
    };
    try {
      source = new EventSource("/api/live/stream?scope=leaderboard");
      source.onmessage = () => scheduleRefresh();
      source.onerror = () => {
        source?.close();
        source = null;
        if (!poll) poll = setInterval(() => router.refresh(), 12_000);
      };
    } catch {
      poll = setInterval(() => router.refresh(), 12_000);
    }
    return () => {
      source?.close();
      if (poll) clearInterval(poll);
      if (refreshTimer) clearTimeout(refreshTimer);
    };
  }, [live, router]);

  useEffect(() => {
    if (reduced) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      setDisplay(data);
      displayRef.current = data;
      yMaxRef.current = seriesYMax(data);
      return;
    }

    const from = displayRef.current;
    const to = data;
    yMaxRef.current = Math.max(
      seriesYMax(from),
      seriesYMax(to),
      yMaxRef.current,
    );

    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFlash(true);
    flashTimerRef.current = setTimeout(() => setFlash(false), 520);

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const start = performance.now();
    const dur = 700;
    let cancelled = false;

    const tick = (now: number) => {
      if (cancelled) return;
      const u = Math.min(1, (now - start) / dur);
      const e = u * u * (3 - 2 * u);
      const interp = interpolateSeries(from, to, e);
      displayRef.current = interp;
      setDisplay(interp);
      if (u < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        displayRef.current = to;
        yMaxRef.current = seriesYMax(to);
        setDisplay(to);
        rafRef.current = 0;
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
    // dataKey: ignore identity-only refreshes that would cancel mid-tween
  }, [dataKey, data, reduced]);

  const chart = useMemo(
    () => layoutChart(display, yMaxRef.current),
    [display],
  );

  const title =
    display.mode === "all-time"
      ? t("race.allTimeTitle")
      : t("race.episodeTitle", {
          number: display.episodeNumber ?? "",
          title: display.title ?? "",
        });

  return (
    <section
      className={`race-chart relative overflow-hidden rounded-2xl border border-border bg-surface/90 p-4 sm:p-5 ${
        flash ? "race-chart-flash" : ""
      }`}
    >
      <div className="race-chart-particles pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: 18 }).map((_, i) => (
          <span key={i} className={`race-particle race-particle-${i % 6}`} />
        ))}
      </div>
      <div className="race-chart-shimmer pointer-events-none absolute inset-0" aria-hidden />

      <header className="relative z-10 mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-accent">
            {display.projected ? (
              <span className="inline-flex items-center gap-1.5">
                <span>{t("race.projectedEyebrow")}</span>
                <span aria-hidden>·</span>
                <LivePulse />
                <span>{t("timeline.statusLive")}</span>
              </span>
            ) : (
              t("race.seasonEyebrow")
            )}
          </p>
          <h2 className="mt-0.5 font-display text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <p className="mt-1 max-w-md text-xs text-muted sm:text-sm">
            {display.mode === "all-time" && display.projectedFromX != null
              ? t("race.allTimeProjectedBody")
              : display.projected
                ? t("race.projectedBody")
                : t("race.allTimeBody")}
          </p>
        </div>
      </header>

      <div className="relative z-10">
        <svg
          viewBox={`0 0 ${chart.width} ${chart.height}`}
          className="h-auto w-full outline-none [&_*]:outline-none"
          role="img"
          aria-label={title}
        >
          <defs>
            <filter id={`${svgId}-glow`} x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {display.players.map((p) => (
              <linearGradient
                key={p.userId}
                id={`${svgId}-grad-${p.userId}`}
                x1="0"
                y1="0"
                x2="1"
                y2="0"
              >
                <stop offset="0%" stopColor={colorForUser(p.userId)} stopOpacity="0.15" />
                <stop offset="100%" stopColor={colorForUser(p.userId)} stopOpacity="0.85" />
              </linearGradient>
            ))}
          </defs>

          {/* grid */}
          {chart.yTicks.map((tick) => (
            <g key={tick.v}>
              <line
                x1={chart.pad.l}
                x2={chart.width - chart.pad.r}
                y1={tick.y}
                y2={tick.y}
                stroke="currentColor"
                className="text-border"
                strokeOpacity={0.55}
                strokeDasharray="3 5"
              />
              <text
                x={chart.pad.l - 8}
                y={tick.y + 3}
                textAnchor="end"
                className="fill-muted"
                fontSize={10}
              >
                {tick.v}
              </text>
            </g>
          ))}

          {chart.xLabels.map((lab) => (
            <text
              key={lab.x}
              x={lab.cx}
              y={chart.height - 10}
              textAnchor="middle"
              className="fill-muted"
              fontSize={10}
            >
              {lab.label}
            </text>
          ))}

          {display.players.map((player) => {
            const paths = chart.paths[player.userId];
            const end = chart.ends[player.userId];
            if (!paths || !end) return null;
            const color = colorForUser(player.userId);
            const dimmed = hoveredId != null && hoveredId !== player.userId;
            const focused = hoveredId === player.userId;
            const strokeW = focused ? 3 : 2.25;
            return (
              <g
                key={player.userId}
                className="race-line-group"
                opacity={dimmed ? 0.18 : 1}
                style={{ transition: "opacity 160ms ease" }}
                onMouseEnter={() => setHoveredId(player.userId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {paths.solid ? (
                  <>
                    <path
                      d={paths.solid}
                      fill="none"
                      stroke={color}
                      strokeWidth={5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={focused ? 0.55 : 0.35}
                      filter={`url(#${svgId}-glow)`}
                      className="pointer-events-none"
                    />
                    <path
                      d={paths.solid}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none"
                    />
                  </>
                ) : null}
                {paths.dashed ? (
                  <>
                    <path
                      d={paths.dashed}
                      fill="none"
                      stroke={color}
                      strokeWidth={4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="5 6"
                      opacity={focused ? 0.4 : 0.22}
                      filter={`url(#${svgId}-glow)`}
                      className="pointer-events-none"
                    />
                    <path
                      d={paths.dashed}
                      fill="none"
                      stroke={color}
                      strokeWidth={strokeW}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeDasharray="6 7"
                      opacity={0.95}
                      className="pointer-events-none"
                    />
                  </>
                ) : null}
                {/* Wide invisible hit target */}
                <path
                  d={paths.hit}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="cursor-pointer outline-none focus:outline-none"
                  tabIndex={-1}
                  aria-hidden
                />
                {focused ? (
                  <g
                    transform={`translate(${end.x}, ${Math.max(end.y - 18, 14)})`}
                    className="race-hover-bubble pointer-events-none"
                  >
                    <rect
                      x={-bubbleWidth(player.displayName) / 2}
                      y={-16}
                      width={bubbleWidth(player.displayName)}
                      height={22}
                      rx={11}
                      fill="var(--surface)"
                      stroke={color}
                      strokeWidth={1.5}
                    />
                    <polygon
                      points={`-5,6 5,6 0,12`}
                      fill={color}
                      transform="translate(0, 0)"
                    />
                    <text
                      textAnchor="middle"
                      y={-1}
                      className="fill-foreground"
                      fontSize={11}
                      fontWeight={600}
                    >
                      {player.displayName}
                    </text>
                  </g>
                ) : null}
              </g>
            );
          })}

          {chart.leader && hoveredId == null ? (
            <g
              transform={`translate(${chart.leader.cx}, ${chart.leader.cy})`}
              className="race-crown pointer-events-none"
            >
              <foreignObject x={-9} y={-20} width={18} height={18}>
                <Crown
                  className="size-[18px] text-[#f5c518]"
                  fill="#f5c518"
                  strokeWidth={1.25}
                  stroke="#c9a227"
                />
              </foreignObject>
            </g>
          ) : null}
          {chart.leader && hoveredId === chart.leaderId ? (
            <g
              transform={`translate(${chart.leader.cx}, ${chart.leader.cy})`}
              className="race-crown pointer-events-none"
            >
              <foreignObject x={-9} y={-20} width={18} height={18}>
                <Crown
                  className="size-[18px] text-[#f5c518]"
                  fill="#f5c518"
                  strokeWidth={1.25}
                  stroke="#c9a227"
                />
              </foreignObject>
            </g>
          ) : null}
        </svg>
      </div>

      <ul className="relative z-10 mt-3 flex flex-wrap gap-x-4 gap-y-2">
        {display.players.map((p) => {
          const last = display.points[display.points.length - 1];
          const pts = last?.pointsByUser[p.userId] ?? 0;
          const isLeader = chart.leaderId === p.userId;
          const dimmed = hoveredId != null && hoveredId !== p.userId;
          return (
            <li
              key={p.userId}
              onMouseEnter={() => setHoveredId(p.userId)}
              onMouseLeave={() => setHoveredId(null)}
              className={`inline-flex cursor-pointer items-center gap-1.5 text-xs transition-opacity ${
                isLeader || hoveredId === p.userId
                  ? "font-semibold text-foreground"
                  : "text-muted"
              } ${dimmed ? "opacity-35" : "opacity-100"}`}
            >
              <span
                className="size-2.5 rounded-full"
                style={{ background: colorForUser(p.userId) }}
              />
              {p.displayName}
              <span className="tabular-nums opacity-80">
                {Math.round(pts)}{" "}
                <span className="text-muted">{t("common.pts")}</span>
              </span>
              {isLeader ? (
                <Crown
                  className="size-3.5 text-[#f5c518]"
                  fill="#f5c518"
                  strokeWidth={1}
                />
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function layoutChart(data: RaceChartData, lockedYMax?: number) {
  const width = 640;
  const height = 260;
  const pad = { t: 36, r: 28, b: 36, l: 36 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  let yMax = lockedYMax && lockedYMax > 0 ? lockedYMax : seriesYMax(data);
  yMax = Math.ceil(yMax / 5) * 5 || 10;

  const xs = data.points.map((p) => p.x);
  const xMin = xs[0] ?? 0;
  const xMax = xs[xs.length - 1] ?? 1;
  const xSpan = Math.max(xMax - xMin, 1);

  const xAt = (x: number) => pad.l + ((x - xMin) / xSpan) * plotW;
  const yAt = (y: number) => pad.t + plotH - (y / yMax) * plotH;

  const paths: Record<
    string,
    { solid: string | null; dashed: string | null; hit: string }
  > = {};
  const ends: Record<string, { x: number; y: number }> = {};
  const projectedFromX = data.projectedFromX ?? null;

  for (const player of data.players) {
    const coords = data.points.map((pt) => ({
      x: xAt(pt.x),
      y: yAt(pt.pointsByUser[player.userId] ?? 0),
      dataX: pt.x,
    }));
    const hit = coordsToPath(coords);
    let solid: string | null = null;
    let dashed: string | null = null;

    if (projectedFromX == null) {
      solid = hit;
    } else {
      const splitIdx = data.points.findIndex((p) => p.x >= projectedFromX);
      if (splitIdx <= 0) {
        dashed = hit;
      } else {
        solid = coordsToPath(coords.slice(0, splitIdx));
        dashed = coordsToPath(coords.slice(splitIdx - 1));
      }
    }

    paths[player.userId] = { solid, dashed, hit };
    const lastCoord = coords[coords.length - 1];
    if (lastCoord) ends[player.userId] = lastCoord;
  }

  const last = data.points[data.points.length - 1];
  let leaderId: string | null = null;
  let leaderPts = -1;
  if (last) {
    for (const p of data.players) {
      const v = last.pointsByUser[p.userId] ?? 0;
      if (v > leaderPts) {
        leaderPts = v;
        leaderId = p.userId;
      }
    }
  }

  let leader: { cx: number; cy: number } | null = null;
  if (leaderId && last) {
    leader = {
      cx: xAt(last.x),
      cy: yAt(last.pointsByUser[leaderId] ?? 0),
    };
  }

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = Math.round(yMax * f);
    return { v, y: yAt(v) };
  });

  const xLabels = data.points.map((pt) => ({
    x: pt.x,
    label: pt.label,
    cx: xAt(pt.x),
  }));

  return {
    width,
    height,
    pad,
    paths,
    ends,
    yTicks,
    xLabels,
    leader,
    leaderId,
  };
}

function coordsToPath(coords: { x: number; y: number }[]) {
  if (coords.length === 0) return "";
  return coords
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(" ");
}

function bubbleWidth(name: string) {
  return Math.min(160, Math.max(56, name.length * 7.2 + 20));
}

function seriesYMax(data: RaceChartData) {
  let yMax = 1;
  for (const pt of data.points) {
    for (const v of Object.values(pt.pointsByUser)) {
      if (v > yMax) yMax = v;
    }
  }
  return yMax;
}

function seriesKey(data: RaceChartData) {
  return JSON.stringify({
    mode: data.mode,
    episodeId: data.episodeId ?? null,
    projectedFromX: data.projectedFromX ?? null,
    players: data.players.map((p) => p.userId),
    points: data.points.map((p) => [p.x, p.pointsByUser]),
  });
}

/** Interpolate by x-key so historical vertices stay put when a new point is appended.
 * New tips ease out from the previous tip in both x and y so the axis grows as an extension. */
function interpolateSeries(
  from: RaceChartData,
  to: RaceChartData,
  e: number,
): RaceChartData {
  const fromByX = new Map(from.points.map((p) => [p.x, p]));
  const fromLast =
    from.points.length > 0 ? from.points[from.points.length - 1]! : undefined;
  const points = to.points.map((pt) => {
    const prev = fromByX.get(pt.x);
    const isNew = !prev;
    const x =
      isNew && fromLast != null
        ? fromLast.x + (pt.x - fromLast.x) * e
        : pt.x;
    const pointsByUser: Record<string, number> = {};
    for (const player of to.players) {
      const id = player.userId;
      const b = pt.pointsByUser[id] ?? 0;
      const a = prev
        ? (prev.pointsByUser[id] ?? 0)
        : (fromLast?.pointsByUser[id] ?? 0);
      pointsByUser[id] = a + (b - a) * e;
    }
    return { ...pt, x, pointsByUser };
  });
  return { ...to, points };
}

export function RaceChartSection({
  allTime,
  liveRace,
}: {
  allTime: RaceChartData;
  liveRace: RaceChartData | null;
}) {
  const t = useT();
  const [mode, setMode] = useState<"race" | "all-time">(
    liveRace ? "race" : "all-time",
  );

  const showToggle = Boolean(liveRace);

  return (
    <div className="space-y-3">
      {showToggle ? (
        <div className="flex gap-1 rounded-xl border border-border bg-background/60 p-1">
          <button
            type="button"
            onClick={() => setMode("race")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
              mode === "race"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t("race.tabTonight")}
          </button>
          <button
            type="button"
            onClick={() => setMode("all-time")}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm ${
              mode === "all-time"
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {t("race.tabAllTime")}
          </button>
        </div>
      ) : null}
      <RaceChart
        data={mode === "race" && liveRace ? liveRace : allTime}
        live={Boolean(liveRace) || allTime.projected}
      />
    </div>
  );
}
