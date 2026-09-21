import type { LiveEpisodePayload, LiveResultRow } from "@/lib/live-bus";
import { prisma } from "@/lib/prisma";

export async function getLiveEpisodeSnapshot(
  episodeId: string,
): Promise<LiveEpisodePayload | null> {
  const episode = await prisma.episode.findUnique({
    where: { id: episodeId },
    include: {
      actualResults: {
        select: {
          coupleId: true,
          judgeScore: true,
          isEliminated: true,
        },
      },
    },
  });

  if (!episode) return null;

  return {
    episodeId: episode.id,
    status: episode.status,
    results: episode.actualResults.map(
      (r): LiveResultRow => ({
        coupleId: r.coupleId,
        judgeScore: r.judgeScore,
        isEliminated: r.isEliminated,
      }),
    ),
    updatedAt: new Date().toISOString(),
  };
}
