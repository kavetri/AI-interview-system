import React, { useMemo, useState } from "react";
import { Award, Briefcase, CheckCircle2, Sparkles, Star, TrendingUp, Trophy, Users } from "lucide-react";
import { RankBadge, StatCard, TypeCountCard, average, formatDateTime } from "./SharedUI";
import { RANK_ORDER, getBadgeMeta, getDailyChallengeStatus, getRankProgress } from "../utils/gamification";

const ScoreChip = ({ label, value, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
    emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  };

  return (
    <div className={`rounded-2xl px-4 py-3 ${tones[tone] || tones.slate}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.15em]">{label}</div>
      <div className="mt-1 text-xl font-black">{value}</div>
    </div>
  );
};

const ChallengeStatusPill = ({ status }) => {
  const classes =
    status === "completed_today"
      ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200"
      : status === "missed"
      ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200";

  const label = status === "completed_today" ? "Completed Today" : status === "missed" ? "Recovery Needed" : "Available Today";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${classes}`}>{label}</span>;
};

const SessionReportModal = ({ session, onClose }) => {
  if (!session) return null;

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/70 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="w-full max-w-4xl rounded-[2rem] bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Saved Interview Report</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {session.candidateName || "-"} | {session.type} | {formatDateTime(session.date)}
              </p>
            </div>
            <button onClick={onClose} className="secondary-button">
              Close
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <ScoreChip label="Score" value={`${session.score || 0}/100`} tone="blue" />
            <ScoreChip label="Rating" value={`${session.rating || 0}/10`} tone="emerald" />
            <ScoreChip label="Mode" value={session.sessionMode === "camera" ? "Camera" : "Voice Only"} />
            <ScoreChip label="Questions" value={String(session.questions || 0)} />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <div className="flex items-center gap-2 text-lg font-bold">
                <CheckCircle2 className="h-5 w-5" />
                Strengths
              </div>
              <ul className="mt-4 space-y-3">
                {(session.result?.strengths || []).length ? (
                  session.result.strengths.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-900/70">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-900/70">No detailed strengths saved for this report.</li>
                )}
              </ul>
            </div>
            <div className="rounded-[2rem] border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <div className="flex items-center gap-2 text-lg font-bold">
                <TrendingUp className="h-5 w-5" />
                Areas to Improve
              </div>
              <ul className="mt-4 space-y-3">
                {(session.result?.weaknesses || []).length ? (
                  session.result.weaknesses.map((item, index) => (
                    <li key={`${item}-${index}`} className="rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-900/70">
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-900/70">No improvement notes saved for this report.</li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const countSessionTypes = (sessionHistory) =>
  sessionHistory.reduce(
    (accumulator, session) => ({
      ...accumulator,
      [session.type]: (accumulator[session.type] || 0) + 1,
    }),
    {}
  );

export const RankPage = ({ gamification, dailyChallenge, onStartDailyChallenge }) => {
  const currentBadge = getBadgeMeta(gamification.currentRank);
  const progress = getRankProgress(gamification.totalXp);
  const challengeStatus = getDailyChallengeStatus(gamification, dailyChallenge);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <RankBadge badge={currentBadge} size="xl" emphasize />
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Rank Center</p>
              <h2 className="mt-2 text-4xl font-black text-slate-900 dark:text-slate-100">{gamification.currentRank}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                See your unlocked badge, XP progress, streak status, and the full promotion ladder in one place.
              </p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-slate-50 px-5 py-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Total XP</p>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.totalXp}</div>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Current Streak</p>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.currentStreak}</div>
            </div>
            <div className="rounded-3xl bg-slate-50 px-5 py-4 dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Longest Streak</p>
              <div className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.longestStreak}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">XP Progress</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {progress.nextRank ? `${progress.nextRank.name} is next` : "Top rank reached"}
              </h3>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-right dark:bg-slate-800">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Active badge</p>
              <p className="mt-1 text-lg font-black text-slate-900 dark:text-slate-100">{currentBadge.badgeLabel}</p>
            </div>
          </div>

          <div className="mt-6 rounded-[1.75rem] bg-slate-50 p-5 dark:bg-slate-800">
            <div className="flex items-center justify-between gap-3 text-sm text-slate-600 dark:text-slate-300">
              <span>{progress.currentRank.name}</span>
              <span>{progress.nextRank ? `${Math.max(0, progress.nextRank.minXp - gamification.totalXp)} XP left` : "Completed"}</span>
            </div>
            <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-sky-500 to-emerald-500" style={{ width: `${progress.progressPercent}%` }} />
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              <span>{progress.xpIntoCurrentRank} XP in this rank</span>
              <span>{progress.nextRank ? `${progress.xpNeededForNextRank} XP band` : "Maximum tier"}</span>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {RANK_ORDER.map((rank) => {
              const unlocked = gamification.totalXp >= rank.minXp;
              const current = gamification.currentRank === rank.name;
              const badgeMeta = getBadgeMeta(rank.name);

              return (
                <div
                  key={rank.name}
                  className={`flex items-center gap-4 rounded-[1.75rem] border px-5 py-4 ${
                    current
                      ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                      : unlocked
                      ? "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
                      : "border-slate-200/70 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60"
                  }`}
                >
                  <RankBadge badge={badgeMeta} size="md" emphasize={current} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <h4 className={`text-lg font-bold ${current ? "text-current" : "text-slate-900 dark:text-slate-100"}`}>{rank.name}</h4>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          current
                            ? "bg-white/15 text-white dark:bg-slate-900/10 dark:text-slate-900"
                            : unlocked
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        {current ? "Current rank" : unlocked ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                    <p className={`mt-2 text-sm ${current ? "text-white/75 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"}`}>
                      Unlocks at {rank.minXp} XP • {rank.badgeLabel}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Daily Challenge</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{dailyChallenge.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{dailyChallenge.description}</p>
              </div>
              <ChallengeStatusPill status={challengeStatus} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <ScoreChip label="Type" value={dailyChallenge.interviewType} tone="blue" />
              <ScoreChip label="Mode" value={dailyChallenge.sessionMode === "camera" ? "Camera" : "Voice Only"} tone="emerald" />
            </div>
            <button onClick={onStartDailyChallenge} className="primary-button mt-5">
              Start Daily Challenge
            </button>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Earned Badges</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {gamification.earnedBadges.map((badgeName) => {
                const badgeMeta = getBadgeMeta(badgeName);
                const active = badgeName === gamification.currentRank;

                return (
                  <div
                    key={badgeName}
                    className={`rounded-[1.5rem] p-4 ring-1 ${
                      active
                        ? "bg-slate-900 text-white ring-slate-900 dark:bg-slate-100 dark:text-slate-900 dark:ring-slate-100"
                        : "bg-slate-50 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <RankBadge badge={badgeMeta} size="md" emphasize={active} />
                      <div>
                        <p className={`text-sm font-semibold ${active ? "text-white/70 dark:text-slate-500" : "text-slate-500 dark:text-slate-400"}`}>
                          {active ? "Active badge" : "Unlocked badge"}
                        </p>
                        <p className={`mt-1 text-lg font-black ${active ? "text-current" : "text-slate-900 dark:text-slate-100"}`}>{badgeMeta.badgeLabel}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const ProgressPage = ({ sessionHistory, gamification, dailyChallenge, onStartDailyChallenge, nextRank }) => {
  const [selectedSession, setSelectedSession] = useState(null);
  const overallScore = Math.round(average(sessionHistory.map((session) => session.score || 0)));
  const averageRating = sessionHistory.length ? average(sessionHistory.map((session) => Number(session.rating || 0))).toFixed(1) : "0.0";
  const questionsAnswered = sessionHistory.reduce((sum, session) => sum + (session.questions || 0), 0);
  const typeCounts = countSessionTypes(sessionHistory);
  const challengeStatus = getDailyChallengeStatus(gamification, dailyChallenge);
  const xpToNextRank = nextRank ? Math.max(0, nextRank.minXp - gamification.totalXp) : 0;
  const latestSession = useMemo(() => sessionHistory[sessionHistory.length - 1], [sessionHistory]);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Progress Overview</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Review your score trends, interview activity, XP growth, recent rewards, and the momentum of your preparation.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard value={overallScore || 0} label="Average Score" accent="from-indigo-600 to-slate-900" />
        <StatCard value={averageRating} label="Average Rating" accent="from-fuchsia-600 to-violet-700" />
        <StatCard value={sessionHistory.length} label="Total Sessions" accent="from-cyan-500 to-blue-600" />
        <StatCard value={questionsAnswered} label="Questions Answered" accent="from-emerald-500 to-green-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Daily Challenge</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{dailyChallenge.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{dailyChallenge.description}</p>
            </div>
            <ChallengeStatusPill status={challengeStatus} />
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <ScoreChip label="Challenge Type" value={dailyChallenge.interviewType} tone="blue" />
            <ScoreChip label="Mode" value={dailyChallenge.sessionMode === "camera" ? "Camera" : "Voice Only"} tone="emerald" />
            <ScoreChip label="Date" value={dailyChallenge.dateKey} />
          </div>

          <button onClick={onStartDailyChallenge} className="primary-button mt-5">
            Start Daily Challenge
          </button>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Performance Snapshot</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Star className="h-4 w-4" />
                Latest score
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{latestSession ? `${latestSession.score}/100` : "-"}</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{latestSession ? `${latestSession.rating}/10 rating` : "Complete an interview to start tracking."}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Trophy className="h-4 w-4" />
                XP status
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.totalXp}</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Current rank: {gamification.currentRank}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Sparkles className="h-4 w-4" />
                Next milestone
              </div>
              <div className="mt-3 text-xl font-black text-slate-900 dark:text-slate-100">{nextRank ? nextRank.name : "Diamond maxed"}</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {nextRank ? `${xpToNextRank} XP until promotion` : "You have reached the top rank."}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Interview Mix</h3>
          <div className="mt-5 grid gap-6 md:grid-cols-3 lg:grid-cols-1">
            <TypeCountCard title="HR" count={typeCounts.HR || 0} icon={<Users className="h-5 w-5" />} />
            <TypeCountCard title="Technical" count={typeCounts.Technical || 0} icon={<Briefcase className="h-5 w-5" />} />
            <TypeCountCard title="Combined" count={typeCounts.Combined || 0} icon={<Award className="h-5 w-5" />} />
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recent XP Activity</h3>
          {gamification.xpHistory.length ? (
            <div className="mt-5 space-y-3">
              {[...gamification.xpHistory].slice(-5).reverse().map((item, index) => (
                <div key={`${item.awardedAt}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">+{item.xpAwarded} XP</span>
                    <span className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{formatDateTime(item.awardedAt)}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {item.rewardType === "first_session" ? "First session bonus" : item.dailyChallengeId ? "Daily challenge reward" : "Completed session reward"} • Score {item.sessionScore}/100
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-slate-500 dark:text-slate-400">No XP events yet. Finish a session to populate this timeline.</p>
          )}
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Session History</h3>
        {sessionHistory.length ? (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Candidate</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">XP</th>
                  <th className="px-4 py-3">Rank</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[...sessionHistory].reverse().map((session, index) => (
                  <tr key={`${session.date}-${index}`} className="border-b border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{formatDateTime(session.date)}</td>
                    <td className="px-4 py-4 font-medium text-slate-800 dark:text-slate-100">{session.candidateName || "-"}</td>
                    <td className="px-4 py-4">{session.type}</td>
                    <td className="px-4 py-4">{session.sessionMode === "camera" ? "Camera" : "Voice Only"}</td>
                    <td className="px-4 py-4">{session.score}/100</td>
                    <td className="px-4 py-4">{session.xpAwarded ? `+${session.xpAwarded}` : "-"}</td>
                    <td className="px-4 py-4">{session.rankAfterSession || "-"}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => setSelectedSession(session)} className="secondary-button">
                        View Report
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-5 rounded-3xl bg-slate-50 p-8 text-center text-slate-500 dark:bg-slate-800 dark:text-slate-400">No interviews completed yet.</div>
        )}
      </div>

      <SessionReportModal session={selectedSession} onClose={() => setSelectedSession(null)} />
    </div>
  );
};
