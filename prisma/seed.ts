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
  imageUrl?: string;
  proImageUrl?: string;
};

type NightResult = {
  celebrityName: string;
  judgeScore: number;
  isEliminated?: boolean;
};

/** Local headshots in /public/couples (320px JPEG). */
const COUPLES: CoupleSeed[] = [
  {
    celebrityName: "Jackson Olson",
    proName: "Emma Slater",
    imageUrl: "/couples/jackson-olson.jpg?v=4",
    proImageUrl: "/couples/emma-slater.jpg?v=4",
  },
  {
    celebrityName: "Tyler Cameron",
    proName: "Sharna Burgess",
    imageUrl: "/couples/tyler-cameron.jpg?v=4",
    proImageUrl: "/couples/sharna-burgess.jpg?v=5",
  },
  {
    celebrityName: "Guillermo Rodriguez",
    proName: "Witney Carson",
    imageUrl: "/couples/guillermo-rodriguez.jpg?v=4",
    proImageUrl: "/couples/witney-carson.jpg?v=4",
  },
  {
    celebrityName: "Ezra Frech",
    proName: "Daniella Karagach",
    imageUrl: "/couples/ezra-frech.jpg?v=4",
    proImageUrl: "/couples/daniella-karagach.jpg?v=4",
  },
  {
    celebrityName: "Connor Wood",
    proName: "Rylee Arnold",
    imageUrl: "/couples/connor-wood.jpg?v=4",
    proImageUrl: "/couples/rylee-arnold.jpg?v=4",
  },
  {
    celebrityName: "Taylor Hanson",
    proName: "Britt Stewart",
    imageUrl: "/couples/taylor-hanson.jpg?v=4",
    proImageUrl: "/couples/britt-stewart.jpg?v=4",
  },
  {
    celebrityName: "Harry Shum Jr.",
    proName: "Jenna Johnson",
    imageUrl: "/couples/harry-shum-jr.jpg?v=4",
    proImageUrl: "/couples/jenna-johnson.jpg?v=4",
  },
  {
    celebrityName: "Conner Leavitt",
    proName: "Adele Zaikman",
    imageUrl: "/couples/conner-leavitt.jpg?v=4",
    proImageUrl: "/couples/adele-zaikman.jpg?v=4",
  },
  {
    celebrityName: "Tatyana Ali",
    proName: "Jan Ravnik",
    imageUrl: "/couples/tatyana-ali.jpg?v=4",
    proImageUrl: "/couples/jan-ravnik.jpg?v=4",
  },
  {
    celebrityName: "Amber Glenn",
    proName: "Pasha Pashkov",
    imageUrl: "/couples/amber-glenn.jpg?v=4",
    proImageUrl: "/couples/pasha-pashkov.jpg?v=4",
  },
  {
    celebrityName: "Ciara Miller",
    proName: "Brandon Armstrong",
    imageUrl: "/couples/ciara-miller.jpg?v=4",
    proImageUrl: "/couples/brandon-armstrong.jpg?v=4",
  },
  {
    celebrityName: "Giada De Laurentiis",
    proName: "Alan Bersten",
    imageUrl: "/couples/giada-de-laurentiis.jpg?v=4",
    proImageUrl: "/couples/alan-bersten.jpg?v=4",
  },
  {
    celebrityName: "Julia Stiles",
    proName: "Ezra Sosa",
    imageUrl: "/couples/julia-stiles.jpg?v=4",
    proImageUrl: "/couples/ezra-sosa.jpg?v=4",
  },
  {
    celebrityName: "Maura Higgins",
    proName: "Mark Ballas",
    imageUrl: "/couples/maura-higgins.jpg?v=4",
    proImageUrl: "/couples/mark-ballas.jpg?v=4",
  },
  {
    celebrityName: "Sarah Jane Nader",
    proName: "Hailey Bills",
    imageUrl: "/couples/sarah-jane-nader.jpg?v=4",
    proImageUrl: "/couples/hailey-bills.jpg?v=4",
  },
  {
    celebrityName: "Jenna Dewan",
    proName: "Val Chmerkovskiy",
    imageUrl: "/couples/jenna-dewan.jpg?v=4",
    proImageUrl: "/couples/val-chmerkovskiy.jpg?v=4",
  },
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
  const images = {
    imageUrl: seed.imageUrl ?? null,
    proImageUrl: seed.proImageUrl ?? null,
  };
  if (existing) {
    return prisma.couple.update({
      where: { id: existing.id },
      data: {
        status: CoupleStatus.ACTIVE,
        eliminatedEpisodeId: null,
        ...images,
      },
    });
  }
  return prisma.couple.create({
    data: {
      celebrityName: seed.celebrityName,
      proName: seed.proName,
      status: CoupleStatus.ACTIVE,
      ...images,
    },
  });
}

async function upsertEpisode(data: {
  episodeNumber: number;
  title: string;
  airDate: Date;
  status: EpisodeStatus;
  isFinale?: boolean;
}) {
  return prisma.episode.upsert({
    where: { episodeNumber: data.episodeNumber },
    create: {
      episodeNumber: data.episodeNumber,
      title: data.title,
      airDate: data.airDate,
      status: data.status,
      isFinale: Boolean(data.isFinale),
    },
    update: {
      title: data.title,
      airDate: data.airDate,
      status: data.status,
      isFinale: Boolean(data.isFinale),
    },
  });
}

const EPISODES: {
  episodeNumber: number;
  title: string;
  airDate: string;
  status: EpisodeStatus;
  isFinale?: boolean;
}[] = [
  {
    episodeNumber: 1,
    title: "Premiere: Night One",
    airDate: "2026-09-15",
    status: EpisodeStatus.PAST,
  },
  {
    episodeNumber: 2,
    title: "Premiere: Night Two",
    airDate: "2026-09-16",
    status: EpisodeStatus.PAST,
  },
  {
    episodeNumber: 3,
    title: "Viral Hits Night",
    airDate: "2026-09-22",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 4,
    title: "Yacht Rock Night",
    airDate: "2026-09-29",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 5,
    title: "Mariah Carey Night",
    airDate: "2026-10-06",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 6,
    title: "Week 5",
    airDate: "2026-10-13",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 7,
    title: "Dedication Night",
    airDate: "2026-10-20",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 8,
    title: "Horror Movie Night",
    airDate: "2026-10-27",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 9,
    title: "Disney Night",
    airDate: "2026-11-03",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 10,
    title: "Grammy Night",
    airDate: "2026-11-10",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 11,
    title: "Semi-Finals",
    airDate: "2026-11-17",
    status: EpisodeStatus.UPCOMING,
  },
  {
    episodeNumber: 12,
    title: "Finale",
    airDate: "2026-11-24",
    status: EpisodeStatus.UPCOMING,
    isFinale: true,
  },
];

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

  const episodes = [];
  for (const ep of EPISODES) {
    episodes.push(
      await upsertEpisode({
        episodeNumber: ep.episodeNumber,
        title: ep.title,
        airDate: new Date(`${ep.airDate}T12:00:00.000Z`),
        status: ep.status,
        isFinale: ep.isFinale,
      }),
    );
  }

  // Drop any stray episodes outside the known Season 35 slate
  await prisma.episode.deleteMany({
    where: { episodeNumber: { gt: EPISODES.length } },
  });

  const ep1 = episodes[0];
  const ep2 = episodes[1];

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
    `Seeded Season 35: ${couples.length} couples, ${episodes.length} episodes (finale Ep ${EPISODES.length}).`,
  );

  await prisma.appSettings.upsert({
    where: { id: "default" },
    create: { id: "default", prizePoolCents: 0 },
    update: {},
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
