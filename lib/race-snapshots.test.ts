import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Pure helper mirroring ZERO_CHART_EPISODES + cumulative fold for tests. */
function cumulativeWithZeroEps(
  episodeTotals: { episodeNumber: number; pointsByUser: Record<string, number> }[],
  userIds: string[],
  zeroEps: Set<number>,
) {
  const points: { x: number; pointsByUser: Record<string, number> }[] = [
    {
      x: 0,
      pointsByUser: Object.fromEntries(userIds.map((id) => [id, 0])),
    },
  ];
  const cumulative = Object.fromEntries(userIds.map((id) => [id, 0]));
  for (const ep of episodeTotals) {
    for (const id of userIds) {
      const add = zeroEps.has(ep.episodeNumber)
        ? 0
        : (ep.pointsByUser[id] ?? 0);
      cumulative[id] = (cumulative[id] ?? 0) + add;
    }
    points.push({ x: ep.episodeNumber, pointsByUser: { ...cumulative } });
  }
  return points;
}

describe("season cumulative series (ep1–2 zero)", () => {
  it("stays flat through ep1–2 then adds ep3", () => {
    const series = cumulativeWithZeroEps(
      [
        { episodeNumber: 1, pointsByUser: { a: 40, b: 30 } },
        { episodeNumber: 2, pointsByUser: { a: 20, b: 50 } },
        { episodeNumber: 3, pointsByUser: { a: 48, b: 39 } },
      ],
      ["a", "b"],
      new Set([1, 2]),
    );
    assert.deepEqual(series[0]!.pointsByUser, { a: 0, b: 0 });
    assert.deepEqual(series[1]!.pointsByUser, { a: 0, b: 0 });
    assert.deepEqual(series[2]!.pointsByUser, { a: 0, b: 0 });
    assert.deepEqual(series[3]!.pointsByUser, { a: 48, b: 39 });
  });

  it("accumulates later episodes", () => {
    const series = cumulativeWithZeroEps(
      [
        { episodeNumber: 3, pointsByUser: { a: 10 } },
        { episodeNumber: 4, pointsByUser: { a: 5 } },
      ],
      ["a"],
      new Set([1, 2]),
    );
    assert.equal(series[1]!.pointsByUser.a, 10);
    assert.equal(series[2]!.pointsByUser.a, 15);
  });
});
