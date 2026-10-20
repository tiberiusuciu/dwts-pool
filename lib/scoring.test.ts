import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { scoreEpisodeFromData } from "./score-episode";

type Pred = Parameters<typeof scoreEpisodeFromData>[0]["predictions"][number];

function pred(partial: Partial<Pred> & Pick<Pred, "kind">): Pred {
  return {
    seasonWinnerCoupleId: null,
    seasonWinnerFromEpisodeNumber: null,
    predictedEliminatedCoupleId: null,
    predictsNoElimination: false,
    coupleId: null,
    predictedRank: null,
    ...partial,
  };
}

describe("scoreEpisodeFromData rank ranges", () => {
  const couples = [
    { id: "c1", celebrityName: "Zoe" },
    { id: "c2", celebrityName: "Amy" },
    { id: "c3", celebrityName: "Ben" },
    { id: "c4", celebrityName: "Cy" },
  ];

  it("scores ep3+ ties with wildcard ranges and keeps elim points", () => {
    const breakdown = scoreEpisodeFromData({
      episode: {
        id: "ep3",
        episodeNumber: 3,
        title: "Week 3",
        isFinale: false,
        noElimination: false,
      },
      results: [
        { coupleId: "c1", judgeScore: 30, isEliminated: false },
        { coupleId: "c2", judgeScore: 30, isEliminated: false },
        { coupleId: "c3", judgeScore: 24, isEliminated: false },
        { coupleId: "c4", judgeScore: 18, isEliminated: true },
      ],
      predictions: [
        pred({
          kind: "WEEKLY_ELIMINATION",
          predictedEliminatedCoupleId: "c4",
        }),
        pred({ kind: "WEEKLY_RANK", coupleId: "c1", predictedRank: 2 }),
        pred({ kind: "WEEKLY_RANK", coupleId: "c2", predictedRank: 1 }),
        pred({ kind: "WEEKLY_RANK", coupleId: "c3", predictedRank: 3 }),
        pred({ kind: "WEEKLY_RANK", coupleId: "c4", predictedRank: 4 }),
      ],
      couples,
      activeWinnerCoupleId: null,
    });

    assert.equal(breakdown.elimPts, 25);
    // Top tie [1,2]: both predictions hit → 3+3; c3 exact 3; c4 exact 3
    assert.equal(breakdown.rankPts, 12);
    assert.equal(breakdown.total, 37);

    const tip = breakdown.ranks.filter(
      (r) => r.coupleId === "c1" || r.coupleId === "c2",
    );
    assert.ok(tip.every((r) => r.actualRank === 1 && r.actualRankMax === 2));
    assert.ok(tip.every((r) => r.points === 3));
  });

  it("legacy ep1 still uses alphabetical unique ranks", () => {
    const breakdown = scoreEpisodeFromData({
      episode: {
        id: "ep1",
        episodeNumber: 1,
        title: "Week 1",
        isFinale: false,
        noElimination: false,
      },
      results: [
        { coupleId: "c1", judgeScore: 30, isEliminated: false },
        { coupleId: "c2", judgeScore: 30, isEliminated: true },
      ],
      predictions: [
        pred({
          kind: "WEEKLY_ELIMINATION",
          predictedEliminatedCoupleId: "c2",
        }),
        pred({ kind: "WEEKLY_RANK", coupleId: "c1", predictedRank: 1 }),
        pred({ kind: "WEEKLY_RANK", coupleId: "c2", predictedRank: 2 }),
      ],
      couples: [
        { id: "c1", celebrityName: "Zoe" },
        { id: "c2", celebrityName: "Amy" },
      ],
      activeWinnerCoupleId: null,
    });

    // Alphabetical: Amy=c2 rank 1, Zoe=c1 rank 2 when tied
    const amy = breakdown.ranks.find((r) => r.coupleId === "c2")!;
    const zoe = breakdown.ranks.find((r) => r.coupleId === "c1")!;
    assert.equal(amy.actualRank, 1);
    assert.equal(amy.actualRankMax, 1);
    assert.equal(zoe.actualRank, 2);
    assert.equal(breakdown.elimPts, 50);
  });
});

describe("scoreEpisodeFromData no-elimination pick", () => {
  const couples = [
    { id: "c1", celebrityName: "Zoe" },
    { id: "c2", celebrityName: "Amy" },
  ];
  const scoredNoElim = [
    { coupleId: "c1", judgeScore: 30, isEliminated: false },
    { coupleId: "c2", judgeScore: 24, isEliminated: false },
  ];
  const nonePick = [
    pred({ kind: "WEEKLY_ELIMINATION", predictsNoElimination: true }),
  ];

  it("pays ep3 elim points when admin flags a no-elimination week", () => {
    const breakdown = scoreEpisodeFromData({
      episode: {
        id: "ep3",
        episodeNumber: 3,
        title: "Week 3",
        isFinale: false,
        noElimination: true,
      },
      results: scoredNoElim,
      predictions: nonePick,
      couples,
      activeWinnerCoupleId: null,
    });
    assert.equal(breakdown.elimPts, 25);
    assert.equal(breakdown.predictedNoElimination, true);
    assert.equal(breakdown.actualNoElimination, true);
  });

  it("pays legacy ep1 elim points for a correct none pick", () => {
    const breakdown = scoreEpisodeFromData({
      episode: {
        id: "ep1",
        episodeNumber: 1,
        title: "Week 1",
        isFinale: false,
        noElimination: true,
      },
      results: scoredNoElim,
      predictions: nonePick,
      couples,
      activeWinnerCoupleId: null,
    });
    assert.equal(breakdown.elimPts, 50);
  });

  it("pays 0 without the admin flag, even if nobody was eliminated", () => {
    const breakdown = scoreEpisodeFromData({
      episode: {
        id: "ep3",
        episodeNumber: 3,
        title: "Week 3",
        isFinale: false,
        noElimination: false,
      },
      results: scoredNoElim,
      predictions: nonePick,
      couples,
      activeWinnerCoupleId: null,
    });
    assert.equal(breakdown.elimPts, 0);
    assert.equal(breakdown.actualNoElimination, false);
  });

  it("pays 0 to the none pick when a couple was eliminated; couple pick still hits", () => {
    const results = [
      { coupleId: "c1", judgeScore: 30, isEliminated: false },
      { coupleId: "c2", judgeScore: 24, isEliminated: true },
    ];
    const episode = {
      id: "ep3",
      episodeNumber: 3,
      title: "Week 3",
      isFinale: false,
      noElimination: true,
    };
    const noneBreakdown = scoreEpisodeFromData({
      episode,
      results,
      predictions: nonePick,
      couples,
      activeWinnerCoupleId: null,
    });
    assert.equal(noneBreakdown.elimPts, 0);
    assert.equal(noneBreakdown.actualNoElimination, false);

    const coupleBreakdown = scoreEpisodeFromData({
      episode,
      results,
      predictions: [
        pred({
          kind: "WEEKLY_ELIMINATION",
          predictedEliminatedCoupleId: "c2",
        }),
      ],
      couples,
      activeWinnerCoupleId: null,
    });
    assert.equal(coupleBreakdown.elimPts, 25);
  });
});
