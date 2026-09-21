import { Role } from "@prisma/client";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { AdminHeader } from "@/components/admin/admin-header";
import { AdminLiveForm } from "@/components/admin/admin-live-form";
import { PrizePoolForm } from "@/components/admin/prize-pool-form";
import {
  getPrizePoolCents,
  listPoolPlayers,
  listPrizeContributions,
} from "@/lib/app-settings";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ episodeId?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== Role.ADMIN) {
    redirect("/");
  }

  const params = await searchParams;
  const [episodes, prizePoolCents, players, contributions] = await Promise.all([
    prisma.episode.findMany({
      orderBy: { episodeNumber: "asc" },
      select: {
        id: true,
        episodeNumber: true,
        title: true,
        status: true,
        isFinale: true,
      },
    }),
    getPrizePoolCents(),
    listPoolPlayers(),
    listPrizeContributions(),
  ]);

  const prizeSection = (
    <PrizePoolForm
      initialCents={prizePoolCents}
      players={players}
      contributions={contributions}
    />
  );

  if (episodes.length === 0) {
    return (
      <div className="space-y-6">
        <AdminHeader empty />
        {prizeSection}
      </div>
    );
  }

  const live = episodes.find((e) => e.status === "LIVE");
  const upcoming = episodes.find((e) => e.status === "UPCOMING");
  const selectedId =
    params.episodeId && episodes.some((e) => e.id === params.episodeId)
      ? params.episodeId
      : (live?.id ?? upcoming?.id ?? episodes[episodes.length - 1].id);

  const results = await prisma.actualResult.findMany({
    where: { episodeId: selectedId },
  });
  const resultByCouple = new Map(results.map((r) => [r.coupleId, r]));

  const couples = await prisma.couple.findMany({
    orderBy: { celebrityName: "asc" },
    select: {
      id: true,
      celebrityName: true,
      proName: true,
      imageUrl: true,
      proImageUrl: true,
    },
  });

  return (
    <div className="space-y-6">
      <AdminHeader />

      {prizeSection}

      <AdminLiveForm
        key={selectedId}
        episodes={episodes}
        initialEpisodeId={selectedId}
        couples={couples.map((c) => {
          const result = resultByCouple.get(c.id);
          return {
            id: c.id,
            celebrityName: c.celebrityName,
            proName: c.proName,
            imageUrl: c.imageUrl,
            proImageUrl: c.proImageUrl,
            judgeScore: result?.judgeScore ?? null,
            isEliminated: result?.isEliminated ?? false,
          };
        })}
      />
    </div>
  );
}
