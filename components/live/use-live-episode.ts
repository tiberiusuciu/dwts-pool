"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LiveEpisodePayload } from "@/lib/live-bus";

export function useLiveEpisode(
  episodeId: string,
  onUpdate: (payload: LiveEpisodePayload) => void,
) {
  const onUpdateRef = useRef(onUpdate);
  onUpdateRef.current = onUpdate;
  const [connected, setConnected] = useState(false);

  const poll = useCallback(async () => {
    const res = await fetch(`/api/live/episode/${episodeId}`);
    if (!res.ok) return;
    const data = (await res.json()) as LiveEpisodePayload;
    onUpdateRef.current(data);
  }, [episodeId]);

  useEffect(() => {
    let source: EventSource | null = null;
    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    function startPoll() {
      if (pollTimer) return;
      void poll();
      pollTimer = setInterval(() => {
        void poll();
      }, 10_000);
    }

    try {
      source = new EventSource(
        `/api/live/stream?episodeId=${encodeURIComponent(episodeId)}`,
      );
      source.onopen = () => {
        if (!cancelled) setConnected(true);
      };
      source.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as {
            type?: string;
            episodeId?: string;
            status?: LiveEpisodePayload["status"];
            results?: LiveEpisodePayload["results"];
            updatedAt?: string;
          };
          if (payload.type === "leaderboard") return;
          if (!payload.episodeId || !payload.status || !payload.results) return;
          onUpdateRef.current({
            type: "scores",
            episodeId: payload.episodeId,
            status: payload.status,
            results: payload.results,
            updatedAt: payload.updatedAt ?? new Date().toISOString(),
          });
        } catch {
          /* ignore malformed */
        }
      };
      source.onerror = () => {
        setConnected(false);
        source?.close();
        source = null;
        startPoll();
      };
    } catch {
      startPoll();
    }

    return () => {
      cancelled = true;
      source?.close();
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [episodeId, poll]);

  return { connected };
}
