import { auth } from "@/auth";
import { EpisodeTimeline } from "@/components/episodes/episode-timeline";
import { getEpisodesWithResults } from "@/lib/episodes";

export default async function HomePage() {
  const [session, episodes] = await Promise.all([
    auth(),
    getEpisodesWithResults(),
  ]);
  const name = session?.user?.displayName ?? "there";

  return (
    <div>
      <p className="font-display text-sm font-medium uppercase tracking-[0.14em] text-accent">
        DWTS Pool
      </p>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">
        Hey, {name}
      </h1>
      <p className="mt-3 max-w-md text-muted">
        Season 35 — follow past scores and get ready for the next live show.
      </p>

      <EpisodeTimeline episodes={episodes} />
    </div>
  );
}
