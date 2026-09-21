/** Flat award for correctly naming the season winner. */
export const SEASON_WINNER_BASE = 50;
/** Extra points for each episode week the final (correct) pick was held. */
export const SEASON_WINNER_PER_WEEK = 25;
/** Season 35 ends on episode 12 (Finale, Nov 24). */
export const SEASON_FINALE_EPISODE = 12;
export const SEASON_EPISODE_COUNT = 12;

/** Weeks held = finale episode number − lock episode number + 1 (min 1). */
export function seasonWinnerWeeksHeld(
  fromEpisodeNumber: number | null | undefined,
  finaleEpisodeNumber: number,
): number {
  const from = fromEpisodeNumber ?? finaleEpisodeNumber;
  return Math.max(1, finaleEpisodeNumber - from + 1);
}

export function scoreSeasonWinnerPoints(
  fromEpisodeNumber: number | null | undefined,
  finaleEpisodeNumber: number,
): number {
  return (
    SEASON_WINNER_BASE +
    SEASON_WINNER_PER_WEEK *
      seasonWinnerWeeksHeld(fromEpisodeNumber, finaleEpisodeNumber)
  );
}
