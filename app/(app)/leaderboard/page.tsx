import { LeaderboardList } from "@/components/leaderboard/leaderboard-list";
import { getLeaderboard } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const entries = await getLeaderboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Leaderboard
        </h1>
        <p className="mt-1 text-sm text-muted">
          Tap a player, then an episode, to inspect elim picks and ranks.
        </p>
      </div>
      <LeaderboardList entries={entries} />
    </div>
  );
}
