/** Admin score entry bounds (official paddle totals). */
export const SCORE_MIN = 3;
export const SCORE_MAX = 30;
export const SCORE_DEFAULT = 18;

export function clampScore(value: number) {
  return Math.min(SCORE_MAX, Math.max(SCORE_MIN, Math.round(value)));
}
