/** Admin score entry floor (no max — guest judges can push totals past 30). */
export const SCORE_MIN = 3;
export const SCORE_DEFAULT = 18;

export function clampScore(value: number) {
  return Math.max(SCORE_MIN, Math.round(value));
}
