import { LeaderboardHeader } from "@/components/leaderboard/leaderboard-header";
import { LeaderboardList } from "@/components/leaderboard/leaderboard-list";
import { getLeaderboard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <div className="space-y-6">
      <LeaderboardHeader />
      <LeaderboardList entries={entries} />
    </div>
  );
}
