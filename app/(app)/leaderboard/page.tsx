import { LeaderboardHeader } from "@/components/leaderboard/leaderboard-header";
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list";
import { RaceChartSection } from "@/components/leaderboard/race-chart";
import {
  getLiveEpisodeRaceIfAny,
  getSeasonCumulativeSeries,
  listPastEpisodeRaces,
} from "@/lib/race-snapshots";
import { getLeaderboard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [entries, allTime, liveRace, pastRaces] = await Promise.all([
    getLeaderboard(),
    getSeasonCumulativeSeries(),
    getLiveEpisodeRaceIfAny(),
    listPastEpisodeRaces(),
  ]);

  return (
    <div className="space-y-6">
      <LeaderboardHeader />
      {liveRace ? (
        <RaceChartSection
          allTime={allTime}
          liveRace={liveRace}
          pastRaces={pastRaces}
        />
      ) : null}
      <LeaderboardList entries={entries} />
      {!liveRace ? (
        <RaceChartSection
          allTime={allTime}
          liveRace={null}
          pastRaces={pastRaces}
        />
      ) : null}
    </div>
  );
}
