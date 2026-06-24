import {
  applySessionRewards,
  buildDailyChallenge,
  createDefaultGamification,
  getDateKey,
  getXpForScore,
} from "./gamification";

describe("gamification rules", () => {
  test("awards 110 XP for the first completed session", () => {
    const reward = applySessionRewards({
      gamification: createDefaultGamification(),
      sessionScore: 91,
      completedAt: "2026-04-20T10:00:00.000Z",
      dailyChallenge: null,
    });

    expect(reward.sessionReward.xpAwarded).toBe(110);
    expect(reward.sessionReward.rewardType).toBe("first_session");
    expect(reward.gamification.totalXp).toBe(110);
    expect(reward.gamification.currentRank).toBe("Iron");
  });

  test("maps scores to the expected standard XP bands", () => {
    expect(getXpForScore(10)).toBe(7);
    expect(getXpForScore(40)).toBe(9);
    expect(getXpForScore(60)).toBe(11);
    expect(getXpForScore(72)).toBe(13);
    expect(getXpForScore(90)).toBe(15);
  });

  test("increments streak only once for the daily challenge and promotes rank when thresholds are crossed", () => {
    const firstChallenge = buildDailyChallenge(new Date("2026-04-20T10:00:00.000Z"));
    const firstReward = applySessionRewards({
      gamification: {
        ...createDefaultGamification(),
        totalXp: 245,
        currentRank: "Iron",
        earnedBadges: ["Iron"],
        firstSessionCompletedAt: "2026-04-18T08:00:00.000Z",
      },
      sessionScore: 90,
      completedAt: "2026-04-20T10:00:00.000Z",
      dailyChallenge: firstChallenge,
    });

    expect(firstReward.sessionReward.xpAwarded).toBe(15);
    expect(firstReward.sessionReward.countedForStreak).toBe(true);
    expect(firstReward.gamification.currentStreak).toBe(1);
    expect(firstReward.gamification.totalXp).toBe(260);
    expect(firstReward.gamification.currentRank).toBe("Bronze");
    expect(firstReward.sessionReward.badgeUnlocked).toBe("Bronze");

    const repeatedReward = applySessionRewards({
      gamification: firstReward.gamification,
      sessionScore: 70,
      completedAt: "2026-04-20T12:00:00.000Z",
      dailyChallenge: firstChallenge,
    });

    expect(repeatedReward.sessionReward.countedForStreak).toBe(false);
    expect(repeatedReward.gamification.currentStreak).toBe(1);
  });

  test("resets streak to one after a missed day", () => {
    const nextChallenge = buildDailyChallenge(new Date("2026-04-23T10:00:00.000Z"));
    const reward = applySessionRewards({
      gamification: {
        ...createDefaultGamification(),
        totalXp: 300,
        currentRank: "Bronze",
        earnedBadges: ["Iron", "Bronze"],
        currentStreak: 4,
        longestStreak: 4,
        firstSessionCompletedAt: "2026-04-18T08:00:00.000Z",
        lastDailyChallengeCompletedOn: getDateKey(new Date("2026-04-20T10:00:00.000Z")),
        completedDailyChallengeDates: ["2026-04-20"],
      },
      sessionScore: 55,
      completedAt: "2026-04-23T10:00:00.000Z",
      dailyChallenge: nextChallenge,
    });

    expect(reward.sessionReward.countedForStreak).toBe(true);
    expect(reward.gamification.currentStreak).toBe(1);
    expect(reward.gamification.longestStreak).toBe(4);
  });
});
