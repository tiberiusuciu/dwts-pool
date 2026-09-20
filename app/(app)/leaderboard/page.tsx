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
          Tap a player to expand weekly prediction breakdowns.
        </p>
      </div>
      <LeaderboardList entries={entries} />
    </div>
  );
}
