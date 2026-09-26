import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildActualRankRanges,
  distanceToRankRange,
  resolveScoringRuleset,
  scoreRankPoints,
} from "./scoring-rules";

describe("buildActualRankRanges", () => {
  it("assigns single ranks when all scores unique", () => {
    const ranges = buildActualRankRanges([
      { coupleId: "a", judgeScore: 30 },
      { coupleId: "b", judgeScore: 28 },
      { coupleId: "c", judgeScore: 20 },
    ]);
    assert.deepEqual(ranges.get("a"), { min: 1, max: 1 });
    assert.deepEqual(ranges.get("b"), { min: 2, max: 2 });
    assert.deepEqual(ranges.get("c"), { min: 3, max: 3 });
  });

  it("assigns [1,2] for top-2 tie", () => {
    const ranges = buildActualRankRanges([
      { coupleId: "a", judgeScore: 30 },
      { coupleId: "b", judgeScore: 30 },
      { coupleId: "c", judgeScore: 25 },
    ]);
    assert.deepEqual(ranges.get("a"), { min: 1, max: 2 });
    assert.deepEqual(ranges.get("b"), { min: 1, max: 2 });
    assert.deepEqual(ranges.get("c"), { min: 3, max: 3 });
  });

  it("assigns middle multi-couple tie [4,6]", () => {
    const ranges = buildActualRankRanges([
      { coupleId: "a", judgeScore: 36 },
      { coupleId: "b", judgeScore: 34 },
      { coupleId: "c", judgeScore: 32 },
      { coupleId: "d", judgeScore: 28 },
      { coupleId: "e", judgeScore: 28 },
      { coupleId: "f", judgeScore: 28 },
      { coupleId: "g", judgeScore: 20 },
    ]);
    assert.deepEqual(ranges.get("a"), { min: 1, max: 1 });
    assert.deepEqual(ranges.get("b"), { min: 2, max: 2 });
    assert.deepEqual(ranges.get("c"), { min: 3, max: 3 });
    assert.deepEqual(ranges.get("d"), { min: 4, max: 6 });
    assert.deepEqual(ranges.get("e"), { min: 4, max: 6 });
    assert.deepEqual(ranges.get("f"), { min: 4, max: 6 });
    assert.deepEqual(ranges.get("g"), { min: 7, max: 7 });
  });

  it("ignores null judge scores", () => {
    const ranges = buildActualRankRanges([
      { coupleId: "a", judgeScore: 30 },
      { coupleId: "x", judgeScore: null },
    ]);
    assert.equal(ranges.size, 1);
    assert.ok(!ranges.has("x"));
  });
});

describe("distanceToRankRange", () => {
  it("returns 0 for wildcard / exact hit", () => {
    assert.equal(distanceToRankRange(1, 1, 2), 0);
    assert.equal(distanceToRankRange(2, 1, 2), 0);
    assert.equal(distanceToRankRange(5, 5, 5), 0);
  });

  it("returns distance below and above the range", () => {
    assert.equal(distanceToRankRange(1, 4, 6), 3);
    assert.equal(distanceToRankRange(3, 4, 6), 1);
    assert.equal(distanceToRankRange(7, 4, 6), 1);
    assert.equal(distanceToRankRange(9, 4, 6), 3);
  });
});

describe("scoreRankPoints distance_bands", () => {
  const ruleset = resolveScoringRuleset(3);

  it("awards 3 pts for either predicted rank in a top-2 tie", () => {
    const range = { min: 1, max: 2 };
    assert.equal(scoreRankPoints(1, 1, 8, ruleset, range), 3);
    assert.equal(scoreRankPoints(2, 1, 8, ruleset, range), 3);
  });

  it("awards band points by distance to range", () => {
    const range = { min: 4, max: 6 };
    assert.equal(scoreRankPoints(4, 4, 8, ruleset, range), 3);
    assert.equal(scoreRankPoints(3, 4, 8, ruleset, range), 2);
    assert.equal(scoreRankPoints(2, 4, 8, ruleset, range), 1);
    assert.equal(scoreRankPoints(1, 4, 8, ruleset, range), 0);
    assert.equal(scoreRankPoints(7, 4, 8, ruleset, range), 2);
    assert.equal(scoreRankPoints(8, 4, 8, ruleset, range), 1);
    assert.equal(scoreRankPoints(9, 4, 8, ruleset, range), 0);
  });
});

describe("scoreRankPoints legacy", () => {
  const ruleset = resolveScoringRuleset(1);

  it("uses n-minus-abs single rank", () => {
    assert.equal(scoreRankPoints(1, 1, 10, ruleset), 10);
    assert.equal(scoreRankPoints(1, 3, 10, ruleset), 8);
    assert.equal(scoreRankPoints(1, 12, 10, ruleset), 0);
  });
});
