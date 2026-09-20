import {
  CoupleStatus,
  EpisodeStatus,
  PrismaClient,
  Role,
} from "@prisma/client";

const prisma = new PrismaClient();

type CoupleSeed = {
  celebrityName: string;
  proName: string;
};

type NightResult = {
  celebrityName: string;
  judgeScore: number;
  isEliminated?: boolean;
};

const COUPLES: CoupleSeed[] = [
  { celebrityName: "Jackson Olson", proName: "Emma Slater" },
  { celebrityName: "Tyler Cameron", proName: "Sharna Burgess" },
  { celebrityName: "Guillermo Rodriguez", proName: "Witney Carson" },
  { celebrityName: "Ezra Frech", proName: "Daniella Karagach" },
  { celebrityName: "Connor Wood", proName: "Rylee Arnold" },
  { celebrityName: "Taylor Hanson", proName: "Britt Stewart" },
  { celebrityName: "Harry Shum Jr.", proName: "Jenna Johnson" },
  { celebrityName: "Conner Leavitt", proName: "Adele Zaikman" },
  { celebrityName: "Tatyana Ali", proName: "Jan Ravnik" },
  { celebrityName: "Amber Glenn", proName: "Pasha Pashkov" },
  { celebrityName: "Ciara Miller", proName: "Brandon Armstrong" },
  { celebrityName: "Giada De Laurentiis", proName: "Alan Bersten" },
  { celebrityName: "Julia Stiles", proName: "Ezra Sosa" },
  { celebrityName: "Maura Higgins", proName: "Mark Ballas" },
  { celebrityName: "Sarah Jane Nader", proName: "Hailey Bills" },
  { celebrityName: "Jenna Dewan", proName: "Val Chmerkovskiy" },
];

const EP1_RESULTS: NightResult[] = [
  { celebrityName: "Jackson Olson", judgeScore: 15 },
  { celebrityName: "Tyler Cameron", judgeScore: 17 },
  { celebrityName: "Guillermo Rodriguez", judgeScore: 10 },
  { celebrityName: "Ezra Frech", judgeScore: 20 },
  { celebrityName: "Connor Wood", judgeScore: 16 },
  { celebrityName: "Taylor Hanson", judgeScore: 16 },
  { celebrityName: "Harry Shum Jr.", judgeScore: 21 },
  { celebrityName: "Conner Leavitt", judgeScore: 12, isEliminated: true },
];

const EP2_RESULTS: NightResult[] = [
  { celebrityName: "Tatyana Ali", judgeScore: 12 },
  { celebrityName: "Amber Glenn", judgeScore: 18 },
  { celebrityName: "Ciara Miller", judgeScore: 15 },
  { celebrityName: "Giada De Laurentiis", judgeScore: 16 },
  { celebrityName: "Julia Stiles", judgeScore: 18 },
  { celebrityName: "Maura Higgins", judgeScore: 21 },
  { celebrityName: "Sarah Jane Nader", judgeScore: 14, isEliminated: true },
  { celebrityName: "Jenna Dewan", judgeScore: 19 },
];

async function upsertCouple(seed: CoupleSeed) {
  const existing = await prisma.couple.findFirst({
    where: { celebrityName: seed.celebrityName, proName: seed.proName },
  });
  if (existing) {
    return prisma.couple.update({
      where: { id: existing.id },
      data: { status: CoupleStatus.ACTIVE, eliminatedEpisodeId: null },
    });
  }
  return prisma.couple.create({
    data: {
      celebrityName: seed.celebrityName,
      proName: seed.proName,
      status: CoupleStatus.ACTIVE,
    },
  });
}

async function upsertEpisode(data: {
  episodeNumber: number;
  title: string;
  airDate: Date;
  status: EpisodeStatus;
}) {
  return prisma.episode.upsert({
    where: { episodeNumber: data.episodeNumber },
    create: data,
    update: {
      title: data.title,
      airDate: data.airDate,
      status: data.status,
    },
  });
}

async function seedNightResults(
  episodeId: string,
  results: NightResult[],
  coupleByName: Map<string, string>,
) {
  await prisma.actualResult.deleteMany({ where: { episodeId } });

  for (const result of results) {
    const coupleId = coupleByName.get(result.celebrityName);
    if (!coupleId) {
      throw new Error(`Missing couple: ${result.celebrityName}`);
    }
    await prisma.actualResult.create({
      data: {
        episodeId,
        coupleId,
        judgeScore: result.judgeScore,
        isEliminated: Boolean(result.isEliminated),
      },
    });
  }
}

async function markEliminated(
  celebrityName: string,
  episodeId: string,
  coupleByName: Map<string, string>,
) {
  const coupleId = coupleByName.get(celebrityName);
  if (!coupleId) {
    throw new Error(`Missing couple: ${celebrityName}`);
  }
  await prisma.couple.update({
    where: { id: coupleId },
    data: {
      status: CoupleStatus.ELIMINATED,
      eliminatedEpisodeId: episodeId,
    },
  });
}

async function main() {
  const couples = [];
  for (const seed of COUPLES) {
    couples.push(await upsertCouple(seed));
  }
  const coupleByName = new Map(
    couples.map((c) => [c.celebrityName, c.id] as const),
  );

  const ep1 = await upsertEpisode({
    episodeNumber: 1,
    title: "Premiere Night 1",
    airDate: new Date("2026-09-15T00:00:00.000Z"),
    status: EpisodeStatus.PAST,
  });
  const ep2 = await upsertEpisode({
    episodeNumber: 2,
    title: "Premiere Night 2",
    airDate: new Date("2026-09-16T00:00:00.000Z"),
    status: EpisodeStatus.PAST,
  });
  await upsertEpisode({
    episodeNumber: 3,
    title: "Week 2",
    airDate: new Date("2026-09-22T00:00:00.000Z"),
    status: EpisodeStatus.UPCOMING,
  });

  await seedNightResults(ep1.id, EP1_RESULTS, coupleByName);
  await seedNightResults(ep2.id, EP2_RESULTS, coupleByName);

  await markEliminated("Conner Leavitt", ep1.id, coupleByName);
  await markEliminated("Sarah Jane Nader", ep2.id, coupleByName);

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (adminEmail) {
    const promoted = await prisma.user.updateMany({
      where: { email: adminEmail },
      data: { role: Role.ADMIN },
    });
    if (promoted.count > 0) {
      console.log(`Promoted ${adminEmail} to ADMIN`);
    }
  }

  console.log(
    `Seeded Season 35: ${couples.length} couples, episodes 1–3, Ep1/Ep2 results.`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
