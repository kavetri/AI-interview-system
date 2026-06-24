export const RANK_ORDER = [
  { name: "Iron", minXp: 0, badgeLabel: "Iron Badge", accent: "slate", imagePath: "/pngs/iron.jpeg" },
  { name: "Bronze", minXp: 250, badgeLabel: "Bronze Badge", accent: "amber", imagePath: "/pngs/bronze.jpeg" },
  { name: "Silver", minXp: 400, badgeLabel: "Silver Badge", accent: "zinc", imagePath: "/pngs/silver.png" },
  { name: "Gold", minXp: 600, badgeLabel: "Gold Badge", accent: "yellow", imagePath: null },
  { name: "Diamond", minXp: 850, badgeLabel: "Diamond Badge", accent: "cyan", imagePath: null },
];

const DAILY_CHALLENGE_VARIANTS = [
  {
    interviewType: "HR",
    sessionMode: "voice_only",
    titles: ["Confidence Warmup", "People Skills Drill", "Behavior Spotlight"],
    descriptions: [
      "A focused HR round to strengthen introductions, teamwork answers, and confident delivery.",
      "A quick behavioral challenge designed to sharpen communication and ownership stories.",
      "A daily HR prompt set for polishing clarity, structure, and self-awareness.",
    ],
  },
  {
    interviewType: "Technical",
    sessionMode: "voice_only",
    titles: ["Technical Sprint", "Problem Solving Push", "Builder's Round"],
    descriptions: [
      "A technical daily challenge centered on project reasoning, fundamentals, and implementation tradeoffs.",
      "A score-focused technical session to practice debugging, tools, and system thinking.",
      "A daily technical round built to tighten explanation quality and practical reasoning.",
    ],
  },
  {
    interviewType: "Combined",
    sessionMode: "voice_only",
    titles: ["Balanced Mock", "Full Prep Round", "Career Combo"],
    descriptions: [
      "A mixed round that blends technical and HR questions for a realistic daily checkpoint.",
      "A combined challenge that tests both communication and technical depth in one session.",
      "A complete daily prep round for maintaining all-around interview readiness.",
    ],
  },
];

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function getDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey) {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function dayIndexFromDate(date) {
  return Math.floor(new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() / MS_PER_DAY);
}

function diffInDays(fromDateKey, toDateKey) {
  const from = parseDateKey(fromDateKey);
  const to = parseDateKey(toDateKey);
  if (!from || !to) return null;
  return Math.round((new Date(to.getFullYear(), to.getMonth(), to.getDate()) - new Date(from.getFullYear(), from.getMonth(), from.getDate())) / MS_PER_DAY);
}

export function createDefaultGamification() {
  return {
    totalXp: 0,
    currentRank: "Iron",
    earnedBadges: ["Iron"],
    currentStreak: 0,
    longestStreak: 0,
    firstSessionCompletedAt: null,
    lastDailyChallengeCompletedOn: null,
    completedDailyChallengeDates: [],
    dailyChallengeHistory: [],
    xpHistory: [],
  };
}

export function normalizeGamification(gamification) {
  const base = createDefaultGamification();
  const merged = {
    ...base,
    ...(gamification || {}),
  };

  const currentRank = getRankForXp(Number(merged.totalXp || 0)).name;
  const earnedBadges = Array.isArray(merged.earnedBadges) ? merged.earnedBadges.filter(Boolean) : [];

  return {
    ...merged,
    totalXp: Number(merged.totalXp || 0),
    currentRank,
    earnedBadges: [...new Set([currentRank, ...earnedBadges, "Iron"])],
    currentStreak: Number(merged.currentStreak || 0),
    longestStreak: Math.max(Number(merged.longestStreak || 0), Number(merged.currentStreak || 0)),
    completedDailyChallengeDates: Array.isArray(merged.completedDailyChallengeDates)
      ? [...new Set(merged.completedDailyChallengeDates.filter(Boolean))]
      : [],
    dailyChallengeHistory: Array.isArray(merged.dailyChallengeHistory) ? merged.dailyChallengeHistory : [],
    xpHistory: Array.isArray(merged.xpHistory) ? merged.xpHistory : [],
  };
}

export function normalizeSessionHistory(sessionHistory = []) {
  return (Array.isArray(sessionHistory) ? sessionHistory : []).map((session) => ({
    rewardType: session?.rewardType || null,
    xpAwarded: Number(session?.xpAwarded || 0),
    dailyChallengeId: session?.dailyChallengeId || null,
    countedForStreak: Boolean(session?.countedForStreak),
    rankAfterSession: session?.rankAfterSession || null,
    badgeUnlocked: session?.badgeUnlocked || null,
    ...session,
  }));
}

export function normalizeUserData(userData = {}) {
  return {
    ...(userData || {}),
    gamification: normalizeGamification(userData?.gamification),
  };
}

export function getRankForXp(totalXp = 0) {
  return [...RANK_ORDER].reverse().find((rank) => totalXp >= rank.minXp) || RANK_ORDER[0];
}

export function getNextRank(totalXp = 0) {
  return RANK_ORDER.find((rank) => rank.minXp > totalXp) || null;
}

export function getXpForScore(score = 0) {
  const numericScore = Number(score || 0);
  if (numericScore >= 85) return 15;
  if (numericScore >= 70) return 13;
  if (numericScore >= 55) return 11;
  if (numericScore >= 40) return 9;
  return 7;
}

export function getBadgeMeta(rankName) {
  return RANK_ORDER.find((rank) => rank.name === rankName) || RANK_ORDER[0];
}

export function getRankProgress(totalXp = 0) {
  const currentRank = getRankForXp(totalXp);
  const nextRank = getNextRank(totalXp);

  if (!nextRank) {
    return {
      currentRank,
      nextRank: null,
      xpIntoCurrentRank: Math.max(0, totalXp - currentRank.minXp),
      xpNeededForNextRank: 0,
      progressPercent: 100,
    };
  }

  const xpIntoCurrentRank = Math.max(0, totalXp - currentRank.minXp);
  const xpNeededForNextRank = Math.max(1, nextRank.minXp - currentRank.minXp);

  return {
    currentRank,
    nextRank,
    xpIntoCurrentRank,
    xpNeededForNextRank,
    progressPercent: Math.min(100, Math.max(0, Math.round((xpIntoCurrentRank / xpNeededForNextRank) * 100))),
  };
}

export function buildDailyChallenge(value = new Date()) {
  const date = value instanceof Date ? value : new Date(value);
  const dateKey = getDateKey(date);
  const index = dayIndexFromDate(date);
  const variant = DAILY_CHALLENGE_VARIANTS[index % DAILY_CHALLENGE_VARIANTS.length];
  const title = variant.titles[index % variant.titles.length];
  const description = variant.descriptions[index % variant.descriptions.length];

  return {
    id: `daily-${dateKey}-${variant.interviewType.toLowerCase()}`,
    dateKey,
    title,
    interviewType: variant.interviewType,
    sessionMode: variant.sessionMode,
    description,
  };
}

export function getDailyChallengeStatus(gamification, challenge, today = new Date()) {
  const normalized = normalizeGamification(gamification);
  const todayKey = getDateKey(today);

  if (normalized.lastDailyChallengeCompletedOn === challenge.dateKey) {
    return "completed_today";
  }

  if (
    normalized.currentStreak > 0 &&
    normalized.lastDailyChallengeCompletedOn &&
    diffInDays(normalized.lastDailyChallengeCompletedOn, todayKey) > 1
  ) {
    return "missed";
  }

  return "available";
}

export function applySessionRewards({ gamification, sessionScore, completedAt, dailyChallenge }) {
  const normalized = normalizeGamification(gamification);
  const completedDate = completedAt ? new Date(completedAt) : new Date();
  const isFirstSession = !normalized.firstSessionCompletedAt;
  const xpAwarded = isFirstSession ? 110 : getXpForScore(sessionScore);
  const rewardType = isFirstSession ? "first_session" : "standard";
  const totalXp = normalized.totalXp + xpAwarded;
  const nextRank = getRankForXp(totalXp);
  const previousRank = normalized.currentRank || "Iron";
  const badgeUnlocked = nextRank.name !== previousRank ? nextRank.name : null;

  let currentStreak = normalized.currentStreak;
  let longestStreak = normalized.longestStreak;
  let countedForStreak = false;
  let lastDailyChallengeCompletedOn = normalized.lastDailyChallengeCompletedOn;
  let completedDailyChallengeDates = normalized.completedDailyChallengeDates.slice();
  let dailyChallengeHistory = normalized.dailyChallengeHistory.slice();

  if (dailyChallenge) {
    const alreadyCompletedToday = normalized.completedDailyChallengeDates.includes(dailyChallenge.dateKey);
    if (!alreadyCompletedToday) {
      const gap = normalized.lastDailyChallengeCompletedOn
        ? diffInDays(normalized.lastDailyChallengeCompletedOn, dailyChallenge.dateKey)
        : null;

      countedForStreak = true;
      currentStreak = gap === 1 ? normalized.currentStreak + 1 : 1;
      longestStreak = Math.max(normalized.longestStreak, currentStreak);
      lastDailyChallengeCompletedOn = dailyChallenge.dateKey;
      completedDailyChallengeDates = [...new Set([...completedDailyChallengeDates, dailyChallenge.dateKey])];
      dailyChallengeHistory = [
        ...dailyChallengeHistory,
        {
          challengeId: dailyChallenge.id,
          dateKey: dailyChallenge.dateKey,
          interviewType: dailyChallenge.interviewType,
          sessionMode: dailyChallenge.sessionMode,
          completedAt: completedDate.toISOString(),
          xpAwarded,
        },
      ];
    }
  }

  const updatedGamification = normalizeGamification({
    ...normalized,
    totalXp,
    currentRank: nextRank.name,
    earnedBadges: badgeUnlocked ? [...normalized.earnedBadges, badgeUnlocked] : normalized.earnedBadges,
    currentStreak,
    longestStreak,
    firstSessionCompletedAt: normalized.firstSessionCompletedAt || completedDate.toISOString(),
    lastDailyChallengeCompletedOn,
    completedDailyChallengeDates,
    dailyChallengeHistory,
    xpHistory: [
      ...normalized.xpHistory,
      {
        awardedAt: completedDate.toISOString(),
        xpAwarded,
        rewardType,
        sessionScore: Number(sessionScore || 0),
        rankAfter: nextRank.name,
        dailyChallengeId: dailyChallenge?.id || null,
      },
    ],
  });

  return {
    gamification: updatedGamification,
    sessionReward: {
      xpAwarded,
      rewardType,
      dailyChallengeId: dailyChallenge?.id || null,
      countedForStreak,
      rankAfterSession: nextRank.name,
      badgeUnlocked,
    },
    rewardSummary: {
      xpAwarded,
      rewardType,
      currentRank: nextRank.name,
      previousRank,
      badgeUnlocked,
      countedForStreak,
      currentStreak: updatedGamification.currentStreak,
      longestStreak: updatedGamification.longestStreak,
      totalXp: updatedGamification.totalXp,
      dailyChallengeTitle: dailyChallenge?.title || null,
    },
  };
}
