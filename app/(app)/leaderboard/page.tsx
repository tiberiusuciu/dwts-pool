import { LeaderboardHeader } from "@/components/leaderboard/leaderboard-header";
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list";
import { RaceChartSection } from "@/components/leaderboard/race-chart";
import {
  getLiveEpisodeRaceIfAny,
  getSeasonCumulativeSeries,
} from "@/lib/race-snapshots";
import { getLeaderboard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [entries, allTime, liveRace] = await Promise.all([
    getLeaderboard(),
    getSeasonCumulativeSeries(),
    getLiveEpisodeRaceIfAny(),
  ]);

  return (
    <div className="space-y-6">
      <LeaderboardHeader />
      {liveRace ? (
        <RaceChartSection allTime={allTime} liveRace={liveRace} />
      ) : null}
      <LeaderboardList entries={entries} />
      {!liveRace ? (
        <RaceChartSection allTime={allTime} liveRace={null} />
      ) : null}
    </div>
  );
}
