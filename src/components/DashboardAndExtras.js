import React, { useEffect, useState } from "react";
import { AlertCircle, Award, Briefcase, CheckCircle, FileSearch, Flame, Shield, Sparkles, Upload, Users } from "lucide-react";
import { analyzeATSResume, uploadResumeFile } from "../utils/interviewApi";
import {
  ErrorBanner,
  FeedbackList,
  LoadingPanel,
  SimpleList,
  StatCard,
  SummaryRow,
  TagList,
  TypeCountCard,
  average,
  cleanSkills,
  formatDateTime,
} from "./SharedUI";
import { getBadgeMeta, getDailyChallengeStatus } from "../utils/gamification";

const CATEGORY_META = [
  { key: "formatting", label: "Formatting", accent: "from-slate-800 to-slate-600" },
  { key: "atsReadability", label: "ATS Readability", accent: "from-cyan-600 to-blue-600" },
  { key: "sectionCompleteness", label: "Sections", accent: "from-emerald-500 to-green-600" },
  { key: "keywordMatch", label: "Keyword Match", accent: "from-violet-600 to-indigo-600" },
  { key: "experienceQuality", label: "Experience", accent: "from-amber-500 to-orange-600" },
  { key: "achievementsImpact", label: "Achievement Impact", accent: "from-pink-500 to-rose-600" },
  { key: "grammarClarity", label: "Clarity", accent: "from-teal-500 to-emerald-600" },
];

const severityTone = {
  high: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  medium: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200",
  low: "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
};

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

const SectionStatusCard = ({ title, data }) => (
  <div className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
    <div className="flex items-center justify-between gap-3">
      <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{title}</h4>
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          data?.present
            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
            : "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200"
        }`}
      >
        {data?.present ? "Present" : "Missing"}
      </span>
    </div>
    {data?.notes?.length ? (
      <ul className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {data.notes.map((note, index) => (
          <li key={`${title}-${index}`} className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">
            {note}
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">No issue flagged in this section.</p>
    )}
  </div>
);

const SessionReportModal = ({ session, onClose }) => {
  if (!session) return null;

  const result = session.result || null;

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

          {result ? (
            <>
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <FeedbackList title="Strengths" icon={<CheckCircle className="h-5 w-5" />} tone="green" items={result.strengths} />
                <FeedbackList title="Areas to Improve" icon={<AlertCircle className="h-5 w-5" />} tone="red" items={result.weaknesses} />
              </div>

              {result.detailedFeedback ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Overall Feedback</h4>
                  <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{result.detailedFeedback}</p>
                </div>
              ) : null}

              {session.cameraSummary?.enabled ? (
                <div className="mt-6 rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Camera Summary</h4>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{session.cameraSummary.summaryText}</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Warnings: {session.cameraSummary.warningCount}</p>
                </div>
              ) : null}

              {result.questionByQuestionAnalysis?.length ? (
                <div className="mt-6 space-y-4">
                  <h4 className="text-lg font-bold text-slate-900 dark:text-slate-100">Question Analysis</h4>
                  {result.questionByQuestionAnalysis.map((item, index) => (
                    <div key={`${item.questionId || index}`} className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Question {index + 1}</p>
                          <h5 className="mt-2 text-base font-bold text-slate-900 dark:text-slate-100">{item.question}</h5>
                        </div>
                        <div className="flex gap-3">
                          <ScoreChip label="Score" value={`${item.score || 0}/10`} tone="blue" />
                          <ScoreChip label="Speaking" value={`${item.speakingScore || 0}/10`} />
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.feedback || "No detailed feedback saved for this answer."}</p>
                      {item.referenceCoverageRatio !== undefined ? (
                        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                          Expected-answer coverage: {item.referenceCoverageRatio}%
                        </p>
                      ) : null}
                      {item.missingReferencePoints?.length ? (
                        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                          Missing expected points: {item.missingReferencePoints.join(", ")}
                        </p>
                      ) : null}
                      {item.referenceAnswer ? (
                        <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Best answer for this question</p>
                          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.referenceAnswer}</p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <div className="mt-6 rounded-3xl bg-slate-50 p-6 text-sm text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              Full saved report details are not available for this older session. The score summary is still shown above.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ATSChecker = ({ userData, saveUserData }) => {
  const [jobDescription, setJobDescription] = useState(userData?.latestATSJobDescription || "");
  const [analysis, setAnalysis] = useState(userData?.latestATSResult || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resumeProfile, setResumeProfile] = useState(userData?.latestCandidateProfile || null);
  const [resumeText, setResumeText] = useState(userData?.latestResumeText || "");
  const [resumeFileName, setResumeFileName] = useState(
    userData?.latestResumeFileName || userData?.latestCandidateProfile?.fileName || ""
  );

  const latestProfile = resumeProfile;
  const latestResumeText = resumeText;
  const latestResumeFileName = resumeFileName || latestProfile?.fileName || "";
  const latestSkills = cleanSkills(latestProfile?.skills || []);
  const latestProjects = latestProfile?.projects || [];

  useEffect(() => {
    setJobDescription(userData?.latestATSJobDescription || "");
    setAnalysis(userData?.latestATSResult || null);
    setResumeProfile(userData?.latestCandidateProfile || null);
    setResumeText(userData?.latestResumeText || "");
    setResumeFileName(userData?.latestResumeFileName || userData?.latestCandidateProfile?.fileName || "");
  }, [
    userData?.latestATSJobDescription,
    userData?.latestATSResult,
    userData?.latestCandidateProfile,
    userData?.latestResumeText,
    userData?.latestResumeFileName,
  ]);

  const handleResumeUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");

    try {
      const payload = await uploadResumeFile(file);
      setResumeProfile(payload.candidateProfile);
      setResumeText(payload.rawText);
      setResumeFileName(payload.fileName);
      setAnalysis(null);

      await saveUserData({
        latestResumeFileName: payload.fileName,
        latestResumeText: payload.rawText,
        latestCandidateProfile: payload.candidateProfile,
        latestATSResult: null,
      });
    } catch (uploadError) {
      setError(uploadError.message || "Resume upload failed.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const runAnalysis = async () => {
    if (!latestProfile || !latestResumeText) {
      setError("Upload a resume in the interview section before running ATS analysis.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await analyzeATSResume({
        candidateProfile: latestProfile,
        rawText: latestResumeText,
        jobDescription,
        fileName: latestResumeFileName,
      });

      setAnalysis(result);
      await saveUserData({
        latestATSResult: result,
        latestATSJobDescription: jobDescription,
        latestATSAnalyzedAt: new Date().toISOString(),
      });
    } catch (analysisError) {
      setError(analysisError.message || "Failed to analyze the resume.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">ATS Checker</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">Resume ATS score and mistake analysis</h2>
            <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
              Analyze the uploaded resume with a genuine ATS-focused score. Add a job description to switch from
              general screening to role-specific matching.
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Latest Resume</p>
            <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{latestResumeFileName || "No resume uploaded yet"}</p>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Last ATS run: {userData?.latestATSAnalyzedAt ? formatDateTime(userData.latestATSAnalyzedAt) : "Not run yet"}
            </p>
          </div>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <LoadingPanel title="Analyzing resume for ATS score..." /> : null}

      {!loading ? (
        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Resume Upload</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Upload a PDF, DOCX, or TXT resume directly here. This will update the latest extracted resume for both
                ATS analysis and the interview flow.
              </p>
              <div className="mt-5 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-800">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                  {latestProfile ? <FileSearch className="h-6 w-6" /> : <Upload className="h-6 w-6" />}
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {latestResumeFileName ? `Current file: ${latestResumeFileName}` : "No resume uploaded in ATS yet"}
                </p>
                <label className="mt-5 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                  <Upload className="h-4 w-4" />
                  {latestResumeFileName ? "Replace Resume" : "Upload Resume"}
                  <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleResumeUpload} />
                </label>
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Role Targeting</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Leave this blank for a generic ATS score, or paste a target job description to calculate role-specific
                keyword fit and evidence match.
              </p>
              <textarea
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value)}
                className="mt-4 min-h-[220px] w-full rounded-3xl border border-slate-300 bg-white p-4 text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300 dark:focus:ring-slate-100/10"
                placeholder="Paste the target job description here for role-specific ATS analysis..."
              />
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-3">
                  <ScoreChip label="Mode" value={jobDescription.trim() ? "Job-specific" : "Generic"} tone="blue" />
                  <ScoreChip label="Skills Found" value={String(latestSkills.length)} tone="emerald" />
                </div>
                <button onClick={runAnalysis} disabled={!latestProfile || !latestResumeText} className="primary-button disabled:opacity-50">
                  {jobDescription.trim() ? "Analyze Against Job Description" : "Analyze Resume"}
                </button>
              </div>
            </div>

            {latestProfile ? (
            <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Extracted Resume Snapshot</h3>
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <SummaryRow label="Candidate" value={latestProfile.fullName || "Not found"} />
                  <SummaryRow label="Email" value={latestProfile.email || "Not found"} />
                  <SummaryRow label="Phone" value={latestProfile.phone || "Not found"} />
                  <SummaryRow label="Location" value={latestProfile.location || "Not found"} />
                </div>
                <div className="mt-5 grid gap-6 md:grid-cols-2">
                  <TagList title="Skills" items={latestSkills} emptyLabel="No clear skills found" />
                  <SimpleList title="Projects" items={latestProjects} emptyLabel="No project details available yet." />
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">How scoring works</h3>
              <ul className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <li className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">Formatting and ATS readability are checked for parser-friendly structure.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">Section completeness checks contact details, summary, skills, experience, and education.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">Keyword matching gets stricter when a job description is provided.</li>
                <li className="rounded-2xl bg-slate-50 px-4 py-3 dark:bg-slate-800">Weak phrases are highlighted with stronger replacement wording to improve the score.</li>
              </ul>
            </div>

            {analysis ? (
              <div className="rounded-[2rem] bg-gradient-to-br from-slate-900 to-indigo-700 p-6 text-white shadow-xl">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Current ATS Score</p>
                <div className="mt-3 text-5xl font-black">{analysis.overallScore}</div>
                <p className="mt-2 text-white/80">Out of 100</p>
                <div className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white">
                  {analysis.mode === "job-specific" ? "Job-specific mode" : "Generic mode"}
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-dashed border-slate-300 bg-white p-8 text-center shadow-xl ring-1 ring-slate-200">
                <h3 className="text-xl font-bold text-slate-900">
                  {latestProfile ? "Run the first ATS analysis" : "Upload a resume to begin"}
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {latestProfile
                    ? "The report will appear here after the resume is analyzed."
                    : "Once you upload a resume, the ATS report will appear here."}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!loading && analysis ? (
        <>
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">ATS Summary</h3>
            <p className="mt-3 text-slate-600 dark:text-slate-300">{analysis.summary}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {CATEGORY_META.map((item) => (
              <StatCard
                key={item.key}
                value={analysis.categoryScores?.[item.key] ?? 0}
                label={`${item.label} / 100`}
                accent={item.accent}
              />
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <FeedbackList title="Strengths" icon={<CheckCircle className="h-5 w-5" />} tone="green" items={analysis.strengths} />
            <FeedbackList title="Priority Fixes" icon={<AlertCircle className="h-5 w-5" />} tone="red" items={analysis.improvementPriority} />
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Keyword Analysis</h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  {analysis.mode === "job-specific"
                    ? "These terms were compared against the target job description."
                    : "These terms were compared against baseline ATS expectations from the resume content."}
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-6 lg:grid-cols-3">
              <TagList title="Matched keywords" items={analysis.keywordAnalysis?.matched || []} emptyLabel="No matched keywords yet." />
              <TagList title="Missing keywords" items={analysis.keywordAnalysis?.missing || []} emptyLabel="No missing keywords flagged." />
              <TagList title="Overused keywords" items={analysis.keywordAnalysis?.overused || []} emptyLabel="No overused keywords flagged." />
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Section-by-Section Review</h3>
            <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(analysis.sectionAnalysis || {}).map(([key, value]) => (
                <SectionStatusCard key={key} title={key.charAt(0).toUpperCase() + key.slice(1)} data={value} />
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Highlighted Resume Mistakes</h3>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Each issue below shows what was flagged, why it hurts ATS performance, and the wording pattern that
              should replace it.
            </p>
            <div className="mt-5 space-y-4">
              {analysis.mistakes?.length ? (
                analysis.mistakes.map((mistake, index) => (
                  <div key={`${mistake.issue}-${index}`} className="rounded-3xl border border-slate-200 p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{mistake.section}</p>
                        <h4 className="mt-2 text-lg font-bold text-slate-900">{mistake.issue}</h4>
                      </div>
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${severityTone[mistake.severity] || severityTone.low}`}>
                        {mistake.severity} priority
                      </span>
                    </div>
                    <div className="mt-4 grid gap-4 lg:grid-cols-3">
                      <div className="rounded-2xl bg-red-50 p-4">
                        <p className="text-sm font-semibold text-red-700">Highlighted text</p>
                        <p className="mt-2 text-sm leading-6 text-red-700">{mistake.snippet}</p>
                      </div>
                      <div className="rounded-2xl bg-amber-50 p-4">
                        <p className="text-sm font-semibold text-amber-700">Why it hurts the score</p>
                        <p className="mt-2 text-sm leading-6 text-amber-700">{mistake.suggestion}</p>
                      </div>
                      <div className="rounded-2xl bg-emerald-50 p-4">
                        <p className="text-sm font-semibold text-emerald-700">Better replacement</p>
                        <p className="mt-2 text-sm leading-6 text-emerald-700">{mistake.replacement}</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-3xl bg-slate-50 p-6 text-sm text-slate-500">No resume mistakes were highlighted in the current analysis.</div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export const ScoringDashboard = ({ sessionHistory, gamification, dailyChallenge, onStartDailyChallenge, nextRank }) => {
  const [selectedSession, setSelectedSession] = useState(null);

  const overallScore = Math.round(average(sessionHistory.map((session) => session.score || 0)));
  const questionsAnswered = sessionHistory.reduce((sum, session) => sum + (session.questions || 0), 0);
  const typeCounts = sessionHistory.reduce(
    (accumulator, session) => ({
      ...accumulator,
      [session.type]: (accumulator[session.type] || 0) + 1,
    }),
    {}
  );
  const currentBadge = getBadgeMeta(gamification.currentRank);
  const challengeStatus = getDailyChallengeStatus(gamification, dailyChallenge);
  const xpToNextRank = nextRank ? Math.max(0, nextRank.minXp - gamification.totalXp) : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Progress and Gamification</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Track your completed interview sessions, XP growth, current rank, earned badges, and daily challenge streak.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <StatCard value={overallScore || 0} label="Average Score" accent="from-indigo-600 to-slate-900" />
        <StatCard value={sessionHistory.length} label="Total Sessions" accent="from-cyan-500 to-blue-600" />
        <StatCard value={questionsAnswered} label="Questions Answered" accent="from-emerald-500 to-green-600" />
        <StatCard value={gamification.totalXp} label="Total XP" accent="from-amber-500 to-orange-600" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Daily Challenge</p>
              <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{dailyChallenge.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{dailyChallenge.description}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                challengeStatus === "completed_today"
                  ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200"
                  : challengeStatus === "missed"
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-200"
                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200"
              }`}
            >
              {challengeStatus === "completed_today" ? "Completed Today" : challengeStatus === "missed" ? "Streak Needs Recovery" : "Available Today"}
            </span>
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
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Rank Snapshot</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Shield className="h-4 w-4" />
                Current rank
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.currentRank}</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{currentBadge.badgeLabel}</p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 dark:bg-slate-800">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
                <Flame className="h-4 w-4" />
                Streak status
              </div>
              <div className="mt-3 text-3xl font-black text-slate-900 dark:text-slate-100">{gamification.currentStreak}</div>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Longest streak: {gamification.longestStreak}</p>
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

      <div className="grid gap-6 md:grid-cols-3">
        <TypeCountCard title="HR" count={typeCounts.HR || 0} icon={<Users className="h-5 w-5" />} />
        <TypeCountCard title="Technical" count={typeCounts.Technical || 0} icon={<Briefcase className="h-5 w-5" />} />
        <TypeCountCard title="Combined" count={typeCounts.Combined || 0} icon={<Award className="h-5 w-5" />} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Badges</h3>
          <div className="mt-5 flex flex-wrap gap-3">
            {gamification.earnedBadges.map((badgeName) => (
              <div
                key={badgeName}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold ${
                  badgeName === gamification.currentRank
                    ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                    : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                }`}
              >
                {getBadgeMeta(badgeName).imagePath ? (
                  <img src={getBadgeMeta(badgeName).imagePath} alt={`${badgeName} badge`} className="h-10 w-10 rounded-xl object-cover" />
                ) : null}
                <span>{getBadgeMeta(badgeName).badgeLabel}</span>
              </div>
            ))}
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

export const InterviewCourses = () => {
  const courses = [
    { company: "TCS", summary: "Company process, aptitude, technical rounds, and HR preparation." },
    { company: "Infosys", summary: "Interview pattern, coding topics, HR expectations, and project questions." },
    { company: "Accenture", summary: "Communication round, technical questions, and common placement prompts." },
    { company: "Wipro", summary: "Campus recruitment style questions and confidence-building practice." },
  ];

  return (
    <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h2 className="text-3xl font-black text-slate-900 dark:text-slate-100">Interview Courses</h2>
      <p className="mt-3 max-w-3xl text-slate-600 dark:text-slate-300">
        This section stays lightweight for now while the interview system is rebuilt. You can expand these course pages
        later with company-specific practice tracks.
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2">
        {courses.map((course) => (
          <div key={course.company} className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">{course.company}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{course.summary}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
