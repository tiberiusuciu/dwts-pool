import { PredictionBreakdown } from "@/components/live/prediction-breakdown";
import {
  getBreakdownForEpisode,
  resolveFocusEpisodeId,
} from "@/lib/live-breakdown";

export const dynamic = "force-dynamic";

export default async function LivePage() {
  const episodeId = await resolveFocusEpisodeId();

  if (!episodeId) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Live pool
        </h1>
        <p className="mt-3 text-sm text-muted">
          No live or past episodes yet. Check back once scores are in.
        </p>
      </div>
    );
  }

  const breakdown = await getBreakdownForEpisode(episodeId);
  if (!breakdown) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Live pool
        </h1>
        <p className="mt-3 text-sm text-muted">Could not load episode data.</p>
      </div>
    );
  }

  return <PredictionBreakdown initial={breakdown} />;
}
