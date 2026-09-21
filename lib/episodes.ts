import type { EpisodeStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export type EpisodeResultDTO = {
  id: string;
  judgeScore: number | null;
  isEliminated: boolean;
  couple: {
    id: string;
    celebrityName: string;
    proName: string;
    imageUrl: string | null;
    proImageUrl: string | null;
  };
};

export type EpisodeDTO = {
  id: string;
  episodeNumber: number;
  title: string;
  airDate: string;
  status: EpisodeStatus;
  results: EpisodeResultDTO[];
};

export async function getEpisodesWithResults(): Promise<EpisodeDTO[]> {
  const episodes = await prisma.episode.findMany({
    orderBy: { episodeNumber: "asc" },
    include: {
      actualResults: {
        include: {
          couple: {
            select: {
              id: true,
              celebrityName: true,
              proName: true,
              imageUrl: true,
              proImageUrl: true,
            },
          },
        },
      },
    },
  });

  return episodes.map((episode) => ({
    id: episode.id,
    episodeNumber: episode.episodeNumber,
    title: episode.title,
    airDate: episode.airDate.toISOString(),
    status: episode.status,
    results: episode.actualResults
      .map((result) => ({
        id: result.id,
        judgeScore: result.judgeScore,
        isEliminated: result.isEliminated,
        couple: result.couple,
      }))
      .sort((a, b) => (b.judgeScore ?? 0) - (a.judgeScore ?? 0)),
  }));
}
