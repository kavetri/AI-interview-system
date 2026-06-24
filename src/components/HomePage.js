import React from "react";
import { Award, CalendarDays, Flame, Mic, Shield, Sparkles, Target, Upload } from "lucide-react";
import { average, BRAND_NAME, BrandMark, FeatureCard, RankBadge, StatCard, formatDateTime } from "./SharedUI";
import { getBadgeMeta, getDailyChallengeStatus, getRankProgress } from "../utils/gamification";

const ChallengeStatePill = ({ status }) => {
  const meta = {
    available: {
      label: "Available Today",
      className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    },
    completed_today: {
      label: "Completed Today",
      className: "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200",
    },
    missed: {
      label: "Streak At Risk",
      className: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200",
    },
  };

  const item = meta[status] || meta.available;
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.className}`}>{item.label}</span>;
};

const RankProgressCard = ({ gamification, nextRank }) => {
  const badge = getBadgeMeta(gamification.currentRank);
  const progress = getRankProgress(gamification.totalXp);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <RankBadge badge={badge} size="md" />
          <div>
          <p className="text-sm text-slate-300">Current rank</p>
          <p className="mt-2 text-2xl font-black">{gamification.currentRank}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white/10 px-4 py-3 text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">XP</p>
          <p className="mt-1 text-2xl font-black">{gamification.totalXp}</p>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between text-sm text-slate-300">
          <span>{nextRank ? `${nextRank.name} unlock` : "Top rank reached"}</span>
          <span>{nextRank ? `${Math.max(0, nextRank.minXp - gamification.totalXp)} XP left` : "Complete"}</span>
        </div>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400" style={{ width: `${progress.progressPercent}%` }} />
        </div>
      </div>
    </div>
  );
};

export const HomePage = ({ currentUser, setCurrentPage, sessionHistory, gamification, dailyChallenge, onStartDailyChallenge, nextRank }) => {
  const latestSession = sessionHistory[sessionHistory.length - 1];
  const avgScore = Math.round(average(sessionHistory.map((item) => item.score || 0)));
  const dailyChallengeStatus = getDailyChallengeStatus(gamification, dailyChallenge);
  const currentBadge = getBadgeMeta(gamification.currentRank);

  return (
    <div className="space-y-8">
      <section className="grid gap-6 rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl lg:grid-cols-[1.25fr_0.95fr]">
        <div>
          <div className="mb-5">
            <BrandMark invert />
          </div>
          <h1 className="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
            Practice resume-based interviews with daily momentum, rank progression, and feedback that tells you what to improve.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-300">
            Upload your resume, complete the daily challenge, collect XP, protect your streak, and turn each mock into visible progress.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={onStartDailyChallenge} className="primary-button">
              Start Daily Challenge
            </button>
            <button onClick={() => setCurrentPage("interview")} className="secondary-button border-white/20 text-white hover:bg-white/10">
              Start Regular Interview
            </button>
            <button onClick={() => setCurrentPage("progress")} className="secondary-button border-white/20 text-white hover:bg-white/10">
              View Progress
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-slate-300">Today’s challenge</p>
                <h2 className="mt-2 text-2xl font-black">{dailyChallenge.title}</h2>
                <p className="mt-2 text-sm text-slate-300">{dailyChallenge.description}</p>
              </div>
              <ChallengeStatePill status={dailyChallengeStatus} />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
              <span className="rounded-full bg-white/10 px-3 py-2">{dailyChallenge.interviewType}</span>
              <span className="rounded-full bg-white/10 px-3 py-2">{dailyChallenge.sessionMode === "camera" ? "Camera" : "Voice Only"}</span>
              <span className="rounded-full bg-white/10 px-3 py-2">{dailyChallenge.dateKey}</span>
            </div>
          </div>

          <RankProgressCard gamification={gamification} nextRank={nextRank} />

          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard value={gamification.currentStreak} label="Current streak" accent="from-orange-500 to-red-500" />
            <StatCard value={sessionHistory.length} label="Sessions completed" accent="from-cyan-500 to-blue-500" />
            <StatCard value={avgScore || 0} label="Average interview score" accent="from-emerald-500 to-green-500" />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Profile Progress</p>
              <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                {currentUser?.firstName}, you’re currently in {gamification.currentRank}
              </h2>
            </div>
            <div className="rounded-3xl bg-slate-100 px-5 py-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Current badge</p>
              <div className="mt-3 flex items-center gap-3">
                <RankBadge badge={currentBadge} size="sm" />
                <p className="text-xl font-black text-slate-900 dark:text-slate-100">{currentBadge.badgeLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4" />
                Total XP
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.totalXp}</div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Flame className="h-4 w-4" />
                Current streak
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.currentStreak}</div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Award className="h-4 w-4" />
                Longest streak
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.longestStreak}</div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Shield className="h-4 w-4" />
                Badges earned
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.earnedBadges.length}</div>
            </div>
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Earned Badges</h3>
              <div className="mt-4 flex flex-wrap gap-3">
                {gamification.earnedBadges.map((badgeName) => {
                  const badgeMeta = getBadgeMeta(badgeName);
                  const active = badgeName === gamification.currentRank;
                  return (
                    <div
                      key={badgeName}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                        active
                          ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                          : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <RankBadge badge={badgeMeta} size="sm" />
                      <span>{badgeMeta.badgeLabel}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Recent Progress</h3>
              {gamification.xpHistory.length ? (
                <div className="mt-4 space-y-3">
                  {[...gamification.xpHistory].slice(-3).reverse().map((item, index) => (
                    <div key={`${item.awardedAt}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">+{item.xpAwarded} XP</span>
                        <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          {item.rewardType === "first_session" ? "First Session" : item.dailyChallengeId ? "Daily Challenge" : "Session"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                        Score {item.sessionScore}/100 • Rank after session: {item.rankAfter}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">Complete your first interview to start building XP history.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Latest activity</h3>
            <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
              {latestSession ? `${latestSession.type} interview scored ${latestSession.score}/100` : "No interview yet"}
            </p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {latestSession ? formatDateTime(latestSession.date) : `Welcome, ${currentUser?.firstName || "User"}`}
            </p>
            {latestSession?.xpAwarded ? (
              <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-300">Latest reward: +{latestSession.xpAwarded} XP</p>
            ) : null}
          </div>

          <FeatureCard
            icon={<CalendarDays className="h-6 w-6" />}
            title="Deterministic daily challenges"
            description="A new challenge is generated every day. Complete it once to keep your streak alive."
          />
          <FeatureCard
            icon={<Upload className="h-6 w-6" />}
            title="Real resume parsing"
            description="Supports PDF, DOCX, and TXT files and extracts structured profile details automatically."
          />
          <FeatureCard
            icon={<Mic className="h-6 w-6" />}
            title="Voice-first interview flow"
            description="Questions are spoken aloud and answers can be captured directly from microphone input."
          />
          <FeatureCard
            icon={<Target className="h-6 w-6" />}
            title={`${BRAND_NAME} coaching`}
            description="Each question gets a score, speaking-quality feedback, and a concrete improvement suggestion."
          />
        </div>
      </section>
    </div>
  );
};

export const TypeCountCard = ({ title, count, icon }) => (
  <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-200">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{title}</p>
        <div className="mt-3 text-4xl font-black text-slate-900">{count}</div>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">{icon}</div>
    </div>
  </div>
);

export const HeroIcon = () => (
  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
    <Award className="h-5 w-5" />
  </div>
);
