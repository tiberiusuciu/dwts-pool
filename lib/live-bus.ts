import { EventEmitter } from "events";
import type { EpisodeStatus } from "@prisma/client";

export type LiveResultRow = {
  coupleId: string;
  judgeScore: number | null;
  isEliminated: boolean;
};

export type LiveEpisodePayload = {
  type?: "scores";
  episodeId: string;
  status: EpisodeStatus;
  results: LiveResultRow[];
  updatedAt: string;
};

export type LeaderboardPayload = {
  type: "leaderboard";
  updatedAt: string;
};

export type LiveBusPayload = LiveEpisodePayload | LeaderboardPayload;

class LiveBus extends EventEmitter {
  publish(payload: LiveBusPayload) {
    this.emit("update", payload);
  }

  subscribe(listener: (payload: LiveBusPayload) => void) {
    this.on("update", listener);
    return () => {
      this.off("update", listener);
    };
  }
}

const globalForLive = globalThis as unknown as { liveBus?: LiveBus };

export const liveBus = globalForLive.liveBus ?? new LiveBus();

if (process.env.NODE_ENV !== "production") {
  globalForLive.liveBus = liveBus;
}

export function publishLiveUpdate(payload: LiveEpisodePayload) {
  liveBus.publish({ ...payload, type: "scores" });
}

export function publishLeaderboardUpdate() {
  liveBus.publish({
    type: "leaderboard",
    updatedAt: new Date().toISOString(),
  });
}
