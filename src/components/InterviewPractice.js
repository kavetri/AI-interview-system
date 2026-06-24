
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  AlertCircle,
  Award,
  Camera,
  CameraOff,
  CheckCircle,
  ChevronRight,
  Flame,
  Mic,
  MicOff,
  Play,
  Sparkles,
  Upload,
} from "lucide-react";
import { evaluateInterview, generateInterviewQuestions, uploadResumeFile } from "../utils/interviewApi";
import { applySessionRewards, normalizeUserData } from "../utils/gamification";
import {
  ErrorBanner,
  FeedbackList,
  InfoPanel,
  LoadingPanel,
  MiniPanel,
  ScoreBadge,
  SimpleList,
  SummaryRow,
  TagList,
  cleanSkills,
} from "./SharedUI";

const INTERVIEW_TYPES = ["HR", "Technical", "Combined"];
const SESSION_MODES = ["camera", "voice_only"];
const FACE_TRACKING_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const FACE_TRACKING_MODEL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const CAMERA_RULES = {
  sustainedViolationMs: 900,
  maxNoseOffset: 0.18,
  maxEyeTilt: 0.12,
  minFaceWidth: 0.075,
};

const createInitialCameraStats = () => ({
  totalFrames: 0,
  faceDetectedFrames: 0,
  attentiveFrames: 0,
  warningCount: 0,
});

const formatPercent = (value) => `${Math.round((Number(value) || 0) * 100)}%`;

const getCameraAttentionLabel = (ratio) => {
  if (ratio >= 0.8) return "Mostly maintained camera attention";
  if (ratio >= 0.55) return "Attention was mixed";
  return "Attention needs improvement";
};

const createCompatibilityReport = (sessionMode) => ({
  browser: {
    status: "pending",
    message: "Checking browser voice support...",
  },
  microphone: {
    status: "pending",
    message: "Checking microphone access...",
  },
  camera: {
    status: sessionMode === "camera" ? "pending" : "skipped",
    message: sessionMode === "camera" ? "Checking camera access..." : "Camera check is skipped for voice-only mode.",
  },
});

const getCompatibilityTone = (status) => {
  if (status === "pass") return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200";
  if (status === "fail") return "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200";
  if (status === "skipped") return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
  return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200";
};

const InterviewTypeCard = ({ type, label, description, active, onClick }) => (
  <button
    onClick={onClick}
    className={`rounded-3xl border p-5 text-left transition ${
      active
        ? "border-slate-900 bg-slate-900 text-white shadow-lg dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
        : "border-slate-200 bg-white hover:border-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-300"
    }`}
  >
    <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${active ? "text-slate-300 dark:text-slate-600" : "text-slate-500 dark:text-slate-400"}`}>{type}</p>
    <h4 className="mt-2 text-lg font-bold">{label}</h4>
    <p className={`mt-2 text-sm leading-6 ${active ? "text-slate-300 dark:text-slate-600" : "text-slate-600 dark:text-slate-300"}`}>{description}</p>
  </button>
);

const SessionModeCard = ({ mode, label, description, active, onClick, icon }) => (
  <button
    onClick={onClick}
    className={`rounded-3xl border p-5 text-left transition ${
      active
        ? "border-indigo-600 bg-indigo-600 text-white shadow-lg"
        : "border-slate-200 bg-white hover:border-indigo-500 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-400"
    }`}
  >
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"}`}>
        {icon}
      </div>
      <div>
        <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${active ? "text-indigo-100" : "text-slate-500 dark:text-slate-400"}`}>{mode}</p>
        <h4 className="text-lg font-bold">{label}</h4>
      </div>
    </div>
    <p className={`mt-3 text-sm leading-6 ${active ? "text-indigo-50" : "text-slate-600 dark:text-slate-300"}`}>{description}</p>
  </button>
);

const InstructionModal = ({
  sessionMode,
  compatibilityReport,
  compatibilityChecking,
  canStartSession,
  compatibilityMessage,
  onClose,
  onConfirm,
  onRunCompatibilityCheck,
}) => {
  const instructions = [
    "Keep your face visible and look toward the screen during the interview.",
    "Allow microphone access before answering questions.",
    sessionMode === "camera"
      ? "Allow camera access because camera monitoring is enabled for this session."
      : "Camera is optional in this mode, but microphone access is still required.",
    "Answer one question at a time and speak clearly.",
    "Warnings may appear if the face is missing or your head turns away.",
  ];

  return (
    <div className="fixed inset-0 z-40 overflow-y-auto bg-slate-950/70 px-4 py-6">
      <div className="flex min-h-full items-center justify-center">
        <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-2xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-6 dark:border-slate-700">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Important Instructions</p>
              <h3 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">
                {sessionMode === "camera" ? "Camera Interview Session" : "Voice-Only Interview Session"}
              </h3>
            </div>
            <button onClick={onClose} className="secondary-button">
              Cancel
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <ul className="space-y-3">
              {instructions.map((item) => (
                <li key={item} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  <span className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
                    <CheckCircle className="h-3.5 w-3.5" />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Compatibility Check</p>
                  <h4 className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-100">Verify microphone and camera before entering</h4>
                </div>
                <button onClick={onRunCompatibilityCheck} disabled={compatibilityChecking} className="secondary-button disabled:opacity-50">
                  {compatibilityChecking ? "Checking..." : "Run Check Again"}
                </button>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                {[
                  { key: "browser", label: "Browser Voice Support" },
                  { key: "microphone", label: "Microphone" },
                  { key: "camera", label: "Camera" },
                ].map((item) => (
                  <div key={item.key} className={`rounded-2xl border p-4 ${getCompatibilityTone(compatibilityReport[item.key].status)}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.15em]">{item.label}</p>
                    <p className="mt-2 text-sm font-semibold capitalize">{compatibilityReport[item.key].status}</p>
                    <p className="mt-2 text-sm leading-6">{compatibilityReport[item.key].message}</p>
                  </div>
                ))}
              </div>

              <p className={`mt-4 text-sm ${canStartSession ? "text-emerald-600 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300"}`}>
                {compatibilityMessage}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-6 py-6 sm:flex-row sm:justify-end dark:border-slate-700">
            <button onClick={onClose} className="secondary-button">
              Go Back
            </button>
            <button onClick={onConfirm} disabled={!canStartSession || compatibilityChecking} className="primary-button disabled:opacity-50">
              {compatibilityChecking ? "Checking Devices..." : "Start Session"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const ResultsView = ({ candidateProfile, interviewType, result, resumeFileName, onRestart }) => (
  <div className="space-y-6">
    <div className="rounded-[2rem] bg-slate-900 p-8 text-white shadow-2xl">
      <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Interview Report</p>
      <h2 className="mt-2 text-4xl font-black">
        {candidateProfile?.fullName || "Candidate"} - {interviewType} Round
      </h2>
      <p className="mt-3 text-slate-300">
        Resume: {resumeFileName || "Uploaded file"} | Overall rating {result.rating}/10
      </p>
    </div>

    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-[2rem] bg-gradient-to-br from-indigo-600 to-slate-900 p-6 text-white shadow-xl">
        <div className="text-4xl font-black">{result.overallScore}</div>
        <div className="mt-2 text-sm font-medium text-white/80">Overall Score / 100</div>
      </div>
      <div className="rounded-[2rem] bg-gradient-to-br from-amber-500 to-orange-600 p-6 text-white shadow-xl">
        <div className="text-4xl font-black">{result.rating.toFixed(1)}</div>
        <div className="mt-2 text-sm font-medium text-white/80">Average Rating / 10</div>
      </div>
    </div>
    {result.rewardSummary ? (
      <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Session Reward</p>
            <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              {result.rewardSummary.rewardType === "first_session" ? "First session bonus unlocked" : "Progress updated"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {result.rewardSummary.dailyChallengeTitle
                ? `This run counted as today's daily challenge: ${result.rewardSummary.dailyChallengeTitle}.`
                : "This was saved as a regular interview session."}
            </p>
          </div>
          <div className="rounded-3xl bg-slate-50 px-5 py-4 text-center dark:bg-slate-800">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">XP Earned</p>
            <p className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">+{result.rewardSummary.xpAwarded}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              <Sparkles className="h-4 w-4" />
              Total XP
            </p>
            <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{result.rewardSummary.totalXp}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              <Award className="h-4 w-4" />
              Rank
            </p>
            <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{result.rewardSummary.currentRank}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
              <Flame className="h-4 w-4" />
              Streak
            </p>
            <p className="mt-2 text-xl font-black text-slate-900 dark:text-slate-100">{result.rewardSummary.currentStreak}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Unlocks</p>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">
              {result.rewardSummary.badgeUnlocked
                ? `${result.rewardSummary.badgeUnlocked} badge earned`
                : result.rewardSummary.countedForStreak
                ? "Daily streak counted"
                : "No new unlock"}
            </p>
          </div>
        </div>
      </div>
    ) : null}
    {result.cameraSummary?.enabled ? (
      <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Camera Monitoring Summary</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Session Mode</p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{result.cameraSummary.sessionMode}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Warnings</p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{result.cameraSummary.warningCount}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Face Visible</p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{formatPercent(result.cameraSummary.faceVisibleRatio)}</p>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Attention</p>
            <p className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{formatPercent(result.cameraSummary.attentiveRatio)}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{result.cameraSummary.summaryText}</p>
      </div>
    ) : null}

    <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Overall Feedback</h3>
      <p className="mt-3 leading-7 text-slate-600 dark:text-slate-300">{result.detailedFeedback}</p>
    </div>

    <div className="grid gap-6 lg:grid-cols-2">
      <FeedbackList title="Strengths" icon={<CheckCircle className="h-5 w-5" />} tone="green" items={result.strengths} />
      <FeedbackList title="Areas to Improve" icon={<AlertCircle className="h-5 w-5" />} tone="red" items={result.weaknesses} />
    </div>

    <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Question-by-Question Analysis</h3>
      <div className="mt-5 space-y-4">
        {result.questionByQuestionAnalysis.map((analysis, index) => (
          <div key={analysis.questionId || index} className="rounded-3xl border border-slate-200 p-5 dark:border-slate-700">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Question {index + 1}</p>
                <h4 className="mt-1 text-lg font-bold text-slate-900 dark:text-slate-100">{analysis.question}</h4>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                  Focus area: {analysis.focusArea || "Interview response"} | {analysis.durationSeconds || 0}s |{" "}
                  {analysis.wordCount || 0} words
                </p>
                {analysis.cameraMetrics?.enabled ? (
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                    Camera warnings during answer: {analysis.cameraMetrics.warningDelta}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-3">
                <ScoreBadge label={analysis.ratingLabel} value={`${analysis.score}/10`} tone={analysis.score >= 8 ? "green" : analysis.score >= 6 ? "yellow" : "red"} />
                <ScoreBadge label="Speaking" value={`${analysis.speakingScore}/10`} tone="blue" />
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Transcript</p>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{analysis.transcript || "No answer captured."}</p>
              </div>
              <div className="space-y-3">
                <MiniPanel title="What worked" items={analysis.strengths} fallback="Build more strong moments in your next round." />
                <MiniPanel title="What was weak" items={analysis.weaknesses} fallback="No major weakness flagged." />
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Feedback</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{analysis.feedback}</p>
              {analysis.referenceCoverageRatio !== undefined ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  Expected-answer coverage: {analysis.referenceCoverageRatio}%
                </p>
              ) : null}
              <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">How to improve this answer</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{analysis.improvementSuggestion}</p>
              {analysis.missingReferencePoints?.length ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Missing expected points</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{analysis.missingReferencePoints.join(", ")}</p>
                </>
              ) : null}
              {analysis.referenceAnswer ? (
                <>
                  <p className="mt-4 text-sm font-semibold text-slate-700 dark:text-slate-200">Best answer for this question</p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{analysis.referenceAnswer}</p>
                </>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Recommended Next Steps</h3>
      <ul className="mt-4 space-y-3">
        {result.recommendations.map((item, index) => (
          <li key={index} className="flex items-start gap-3 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white dark:bg-slate-100 dark:text-slate-900">
              {index + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>

    <button onClick={onRestart} className="primary-button">
      Start New Interview
    </button>
  </div>
);

export const InterviewPractice = ({
  currentUser,
  userData,
  saveUserData,
  addSessionToHistory,
  saveInterviewProgress,
  launchContext,
  onLaunchContextConsumed,
}) => {
  const normalizedUserData = normalizeUserData(userData || {});
  const latestResumeFileName = normalizedUserData.latestResumeFileName || normalizedUserData.latestCandidateProfile?.fileName || "";
  const latestResumeText = normalizedUserData.latestResumeText || "";
  const latestCandidateProfile = normalizedUserData.latestCandidateProfile || null;
  const [step, setStep] = useState(latestCandidateProfile ? "select" : "upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [resumeUpload, setResumeUpload] = useState(latestResumeFileName ? { fileName: latestResumeFileName } : null);
  const [rawResumeText, setRawResumeText] = useState(latestResumeText);
  const [candidateProfile, setCandidateProfile] = useState(latestCandidateProfile);
  const [interviewType, setInterviewType] = useState("");
  const [sessionMode, setSessionMode] = useState("");
  const [showInstructionsModal, setShowInstructionsModal] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [answers, setAnswers] = useState([]);
  const [interviewResult, setInterviewResult] = useState(null);
  const [recognition, setRecognition] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSessions, setRecordingSessions] = useState(0);
  const [transcriptUpdates, setTranscriptUpdates] = useState(0);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState("idle");
  const [cameraStream, setCameraStream] = useState(null);
  const [cameraMonitoringEnabled, setCameraMonitoringEnabled] = useState(false);
  const [headWarningVisible, setHeadWarningVisible] = useState(false);
  const [headWarningMessage, setHeadWarningMessage] = useState("");
  const [cameraWarningCount, setCameraWarningCount] = useState(0);
  const [cameraEventLog, setCameraEventLog] = useState([]);
  const [cameraTrackingReady, setCameraTrackingReady] = useState(false);
  const [cameraStatusText, setCameraStatusText] = useState("Camera mode is optional until you choose it.");
  const [compatibilityReport, setCompatibilityReport] = useState(() => createCompatibilityReport("voice_only"));
  const [compatibilityChecking, setCompatibilityChecking] = useState(false);
  const [compatibilityPassed, setCompatibilityPassed] = useState(false);
  const [compatibilityMessage, setCompatibilityMessage] = useState("Run the compatibility check before starting the session.");
  const [activeChallenge, setActiveChallenge] = useState(launchContext?.dailyChallenge || null);
  const [sessionChallengeContext, setSessionChallengeContext] = useState(null);
  const isChallengeConfigured =
    activeChallenge && activeChallenge.interviewType === interviewType && activeChallenge.sessionMode === sessionMode;
  const answerStartRef = useRef(null);
  const answerCameraStartRef = useRef({
    warningCount: 0,
    eventCount: 0,
    totalFrames: 0,
    faceDetectedFrames: 0,
    attentiveFrames: 0,
  });
  const videoRef = useRef(null);
  const faceLandmarkerRef = useRef(null);
  const monitoringFrameRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);
  const activeViolationRef = useRef(null);
  const violationStartedAtRef = useRef(null);
  const cameraStatsRef = useRef(createInitialCameraStats());
  // The tracker should restart only when camera mode, stream, or interview step changes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!launchContext) {
      return;
    }

    if (launchContext.dailyChallenge) {
      setActiveChallenge(launchContext.dailyChallenge);
      setInterviewType(launchContext.interviewType);
      setSessionMode(launchContext.sessionMode);
      if (latestCandidateProfile) {
        setStep("select");
      }
    }

    onLaunchContextConsumed?.();
  }, [launchContext, latestCandidateProfile, onLaunchContextConsumed]);

  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = "en-US";

      recognitionInstance.onresult = (event) => {
        let finalText = "";
        let interimText = "";

        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          if (result.isFinal) {
            finalText += `${result[0].transcript} `;
          } else {
            interimText += result[0].transcript;
          }
        }

        if (finalText) {
          setCurrentAnswer((existing) => `${existing}${finalText}`.trimStart());
        }

        if (interimText || finalText) {
          setTranscriptUpdates((count) => count + 1);
        }
      };

      recognitionInstance.onerror = () => {
        setIsRecording(false);
      };

      recognitionInstance.onend = () => {
        setIsRecording(false);
      };

      setSpeechSupported(true);
      setRecognition(recognitionInstance);
    }
  }, []);

  useEffect(() => () => {
    if (monitoringFrameRef.current) {
      cancelAnimationFrame(monitoringFrameRef.current);
    }
    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }
  }, [cameraStream]);

  useEffect(() => {
    if (videoRef.current) {
      const videoElement = videoRef.current;
      videoElement.srcObject = cameraStream || null;
      videoElement.muted = true;
      videoElement.playsInline = true;

      if (cameraStream) {
        const ensurePlayback = () => {
          videoElement.play().catch(() => {
            setCameraStatusText("Camera is connected, but the preview is waiting to start.");
          });
        };

        videoElement.onloadedmetadata = ensurePlayback;
        ensurePlayback();
      } else {
        videoElement.onloadedmetadata = null;
      }
    }
  }, [cameraStream, step]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = questions.length ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const transcriptWordCount = useMemo(() => currentAnswer.trim().split(/\s+/).filter(Boolean).length, [currentAnswer]);

  const beginAnswerTimer = () => {
    answerStartRef.current = Date.now();
    answerCameraStartRef.current = {
      warningCount: cameraWarningCount,
      eventCount: cameraEventLog.length,
      totalFrames: cameraStatsRef.current.totalFrames,
      faceDetectedFrames: cameraStatsRef.current.faceDetectedFrames,
      attentiveFrames: cameraStatsRef.current.attentiveFrames,
    };
  };

  const resetWarningState = () => {
    activeViolationRef.current = null;
    violationStartedAtRef.current = null;
    setHeadWarningVisible(false);
    setHeadWarningMessage("");
  };

  const stopCameraStream = () => {
    if (monitoringFrameRef.current) {
      cancelAnimationFrame(monitoringFrameRef.current);
      monitoringFrameRef.current = null;
    }

    if (faceLandmarkerRef.current) {
      faceLandmarkerRef.current.close();
      faceLandmarkerRef.current = null;
    }

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    setCameraStream(null);
    setCameraMonitoringEnabled(false);
    setCameraTrackingReady(false);
    setCameraPermissionStatus("idle");
    setCameraStatusText("Camera mode is optional until you choose it.");
    lastVideoTimeRef.current = -1;
    resetWarningState();
  };

  const resetInterviewState = () => {
    if (recognition && isRecording) {
      recognition.stop();
    }

    stopCameraStream();
    setStep("upload");
    setLoading(false);
    setError("");
    setStatusMessage("");
    setResumeUpload(null);
    setRawResumeText("");
    setCandidateProfile(null);
    setInterviewType("");
    setSessionMode("");
    setShowInstructionsModal(false);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setCurrentAnswer("");
    setAnswers([]);
    setInterviewResult(null);
    setActiveChallenge(null);
    setSessionChallengeContext(null);
    setIsRecording(false);
    setRecordingSessions(0);
    setTranscriptUpdates(0);
    setCameraWarningCount(0);
    setCameraEventLog([]);
    setCompatibilityReport(createCompatibilityReport("voice_only"));
    setCompatibilityChecking(false);
    setCompatibilityPassed(false);
    setCompatibilityMessage("Run the compatibility check before starting the session.");
    cameraStatsRef.current = createInitialCameraStats();
    answerStartRef.current = null;
    answerCameraStartRef.current = {
      warningCount: 0,
      eventCount: 0,
      totalFrames: 0,
      faceDetectedFrames: 0,
      attentiveFrames: 0,
    };
  };

  const handleCameraViolation = useCallback((isAttentive, message, now) => {
    const stats = cameraStatsRef.current;
    if (isAttentive) {
      stats.attentiveFrames += 1;
      resetWarningState();
      return;
    }

    if (!violationStartedAtRef.current) {
      violationStartedAtRef.current = now;
    }

    if (now - violationStartedAtRef.current < CAMERA_RULES.sustainedViolationMs) {
      return;
    }

    if (activeViolationRef.current === message) {
      setHeadWarningVisible(true);
      setHeadWarningMessage(message);
      return;
    }

    activeViolationRef.current = message;
    stats.warningCount += 1;
    setHeadWarningVisible(true);
    setHeadWarningMessage(message);
    setCameraWarningCount(stats.warningCount);
    setCameraEventLog((existing) => [
      ...existing,
      {
        timestamp: new Date(now).toISOString(),
        message,
      },
    ]);
  }, []);

  const handleFaceDetectionResult = useCallback((result) => {
    const now = Date.now();
    const stats = cameraStatsRef.current;
    stats.totalFrames += 1;

    const face = result?.faceLandmarks?.[0];
    if (!face) {
      handleCameraViolation(false, "Face not detected. Please stay in front of the camera.", now);
      return;
    }

    stats.faceDetectedFrames += 1;
    const leftEye = face[33];
    const rightEye = face[263];
    const nose = face[1];

    if (!leftEye || !rightEye || !nose) {
      handleCameraViolation(false, "Face landmarks are unstable. Please look forward.", now);
      return;
    }

    const eyeDistance = Math.abs(rightEye.x - leftEye.x);
    const eyeMidX = (leftEye.x + rightEye.x) / 2;
    const noseOffset = Math.abs(nose.x - eyeMidX) / Math.max(eyeDistance, 0.0001);
    const eyeTilt = Math.abs(leftEye.y - rightEye.y) / Math.max(eyeDistance, 0.0001);

    if (eyeDistance < CAMERA_RULES.minFaceWidth) {
      handleCameraViolation(false, "Move a little closer and keep your face centered.", now);
      return;
    }

    if (noseOffset > CAMERA_RULES.maxNoseOffset || eyeTilt > CAMERA_RULES.maxEyeTilt) {
      handleCameraViolation(false, "Head movement detected. Please look straight at the camera.", now);
      return;
    }

    handleCameraViolation(true, "", now);
  }, [handleCameraViolation]);

  useEffect(() => {
    let cancelled = false;

    const startTracking = async () => {
      if (step !== "interview" || sessionMode !== "camera" || !cameraStream || !videoRef.current) {
        return;
      }

      setCameraStatusText("Preparing camera monitoring...");
      setCameraTrackingReady(false);

      try {
        if (!faceLandmarkerRef.current) {
          const filesetResolver = await FilesetResolver.forVisionTasks(FACE_TRACKING_WASM);
          if (cancelled) return;

          faceLandmarkerRef.current = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: FACE_TRACKING_MODEL,
            },
            runningMode: "VIDEO",
            numFaces: 1,
          });
        }

        const video = videoRef.current;
        if (!video) return;

        await video.play().catch(() => null);
        if (cancelled) return;

        const detectFrame = () => {
          if (cancelled || !videoRef.current || !faceLandmarkerRef.current) {
            return;
          }

          const currentTime = videoRef.current.currentTime;
          if (videoRef.current.readyState >= 2 && currentTime !== lastVideoTimeRef.current) {
            lastVideoTimeRef.current = currentTime;
            const result = faceLandmarkerRef.current.detectForVideo(videoRef.current, performance.now());
            handleFaceDetectionResult(result);
          }

          monitoringFrameRef.current = requestAnimationFrame(detectFrame);
        };

        setCameraMonitoringEnabled(true);
        setCameraTrackingReady(true);
        setCameraStatusText("Camera monitoring is active.");
        monitoringFrameRef.current = requestAnimationFrame(detectFrame);
      } catch (trackingError) {
        setCameraTrackingReady(false);
        setCameraMonitoringEnabled(false);
        setCameraStatusText("Camera preview is active, but head tracking could not start.");
        setError("Camera tracking could not start. You can continue, but head-movement warnings may not appear.");
      }
    };

    startTracking();

    return () => {
      cancelled = true;
      if (monitoringFrameRef.current) {
        cancelAnimationFrame(monitoringFrameRef.current);
        monitoringFrameRef.current = null;
      }
      setCameraMonitoringEnabled(false);
    };
  }, [cameraStream, handleFaceDetectionResult, sessionMode, step]);
  const requestCameraPermission = async () => {
    if (sessionMode !== "camera") {
      return null;
    }

    try {
      setCameraPermissionStatus("requesting");
      setCameraStatusText("Requesting camera permission...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      });

      setCameraStream(stream);
      setCameraPermissionStatus("granted");
      setCameraStatusText("Camera permission granted.");
      return stream;
    } catch (cameraError) {
      setCameraPermissionStatus("denied");
      setCameraStatusText("Camera access was denied.");
      throw new Error("Camera access is required for camera interview mode. You can retry or switch to voice-only.");
    }
  };

  const runCompatibilityCheck = useCallback(async () => {
    const nextReport = createCompatibilityReport(sessionMode);
    setCompatibilityReport(nextReport);
    setCompatibilityChecking(true);
    setCompatibilityPassed(false);
    setCompatibilityMessage("Checking your browser and devices...");

    const finalizeReport = (report) => {
      const browserPassed = report.browser.status === "pass";
      const microphonePassed = report.microphone.status === "pass";
      const cameraPassed = sessionMode === "camera" ? report.camera.status === "pass" : true;
      const passed = browserPassed && microphonePassed && cameraPassed;

      setCompatibilityReport({ ...report });
      setCompatibilityPassed(passed);
      setCompatibilityMessage(
        passed
          ? "Compatibility check passed. You can start the interview now."
          : "Compatibility check failed. Fix the blocked device or permission, then run the check again."
      );
    };

    try {
      if (!speechSupported) {
        nextReport.browser = {
          status: "fail",
          message: "Speech recognition is not supported in this browser. Use Chrome or Edge.",
        };
      } else {
        nextReport.browser = {
          status: "pass",
          message: "Browser voice support is available.",
        };
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        nextReport.microphone = {
          status: "fail",
          message: "Media device access is not available in this browser.",
        };
        if (sessionMode === "camera") {
          nextReport.camera = {
            status: "fail",
            message: "Camera access is not available in this browser.",
          };
        }
        finalizeReport(nextReport);
        return;
      }

      try {
        const microphoneStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: false,
        });
        const hasMicrophoneTrack = microphoneStream.getAudioTracks().length > 0;
        microphoneStream.getTracks().forEach((track) => track.stop());
        nextReport.microphone = hasMicrophoneTrack
          ? {
              status: "pass",
              message: "Microphone access is working.",
            }
          : {
              status: "fail",
              message: "No microphone input was detected.",
            };
      } catch (microphoneError) {
        nextReport.microphone = {
          status: "fail",
          message: microphoneError?.name === "NotAllowedError" ? "Microphone permission was denied." : "Microphone access test failed.",
        };
      }

      if (sessionMode === "camera") {
        try {
          const previewStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          });
          const hasVideoTrack = previewStream.getVideoTracks().length > 0;
          previewStream.getTracks().forEach((track) => track.stop());
          nextReport.camera = hasVideoTrack
            ? {
                status: "pass",
                message: "Camera access is working.",
              }
            : {
                status: "fail",
                message: "No camera feed was detected.",
              };
        } catch (cameraError) {
          nextReport.camera = {
            status: "fail",
            message: cameraError?.name === "NotAllowedError" ? "Camera permission was denied." : "Camera access test failed.",
          };
        }
      }

      finalizeReport(nextReport);
    } finally {
      setCompatibilityChecking(false);
    }
  }, [sessionMode, speechSupported]);

  const handleResumeSelection = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError("");
    setStatusMessage("Extracting resume details...");

    try {
      const payload = await uploadResumeFile(file);
      setResumeUpload({ fileName: payload.fileName });
      setRawResumeText(payload.rawText);
      setCandidateProfile(payload.candidateProfile);
      setStep("select");
      if (!activeChallenge) {
        setSessionMode("");
      }
      setShowInstructionsModal(false);

      await saveUserData({
        latestResumeFileName: payload.fileName,
        latestResumeText: payload.rawText,
        latestCandidateProfile: payload.candidateProfile,
      });
    } catch (uploadError) {
      setError(uploadError.message || "Resume upload failed.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const openInstructionModal = () => {
    if (!candidateProfile || !rawResumeText || !INTERVIEW_TYPES.includes(interviewType)) {
      setError("Upload a resume and choose an interview type first.");
      return;
    }

    if (!SESSION_MODES.includes(sessionMode)) {
      setError("Choose whether you want the session with camera or without camera.");
      return;
    }

    setCompatibilityReport(createCompatibilityReport(sessionMode));
    setCompatibilityChecking(false);
    setCompatibilityPassed(false);
    setCompatibilityMessage("Run the compatibility check before starting the session.");
    setShowInstructionsModal(true);
    setError("");
  };

  useEffect(() => {
    if (showInstructionsModal) {
      runCompatibilityCheck();
    }
  }, [runCompatibilityCheck, showInstructionsModal]);

  const startInterview = async () => {
    if (!candidateProfile || !rawResumeText || !INTERVIEW_TYPES.includes(interviewType) || !SESSION_MODES.includes(sessionMode)) {
      setError("Complete resume upload, interview type, and session mode before starting.");
      return;
    }

    if (!compatibilityPassed) {
      setError("Run the compatibility check and make sure microphone and camera tests pass before starting.");
      return;
    }

    setLoading(true);
    setError("");
    setShowInstructionsModal(false);
    setSessionChallengeContext(
      activeChallenge && activeChallenge.interviewType === interviewType && activeChallenge.sessionMode === sessionMode ? activeChallenge : null
    );
    setStatusMessage(
      activeChallenge && activeChallenge.interviewType === interviewType && activeChallenge.sessionMode === sessionMode
        ? "Preparing today's daily challenge and generating interview questions..."
        : sessionMode === "camera"
        ? "Preparing camera and generating interview questions..."
        : "Generating 10 resume-based questions..."
    );

    try {
      if (sessionMode === "camera") {
        await requestCameraPermission();
      }

      const payload = await generateInterviewQuestions({
        candidateProfile,
        rawText: rawResumeText,
        interviewType,
      });

      setQuestions(payload.questions);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setCurrentAnswer("");
      setRecordingSessions(0);
      setTranscriptUpdates(0);
      setInterviewResult(null);
      setCameraWarningCount(0);
      setCameraEventLog([]);
      cameraStatsRef.current = createInitialCameraStats();
      setStep("interview");

      setTimeout(() => {
        speakQuestion(payload.questions[0]?.question);
        beginAnswerTimer();
      }, 300);
    } catch (questionError) {
      if (sessionMode === "camera") {
        stopCameraStream();
      }
      setError(questionError.message || "Failed to start the interview.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };

  const speakQuestion = (text) => {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const toggleRecording = () => {
    if (!recognition) {
      setError("Speech recognition is not available in this browser. Use Chrome or Edge for voice answers.");
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }

    recognition.start();
    setRecordingSessions((count) => count + 1);
    setIsRecording(true);
  };

  const buildCameraMetricsForAnswer = () => {
    if (sessionMode !== "camera") {
      return {
        enabled: false,
        sessionMode: "voice_only",
      };
    }

    const start = answerCameraStartRef.current;
    const stats = cameraStatsRef.current;
    const totalFrameDelta = Math.max(0, stats.totalFrames - start.totalFrames);
    const faceFrameDelta = Math.max(0, stats.faceDetectedFrames - start.faceDetectedFrames);
    const attentiveFrameDelta = Math.max(0, stats.attentiveFrames - start.attentiveFrames);

    return {
      enabled: true,
      sessionMode: "camera",
      warningCountAtAnswer: cameraWarningCount,
      warningDelta: Math.max(0, cameraWarningCount - start.warningCount),
      eventDelta: Math.max(0, cameraEventLog.length - start.eventCount),
      faceVisibleRatio: totalFrameDelta ? Number((faceFrameDelta / totalFrameDelta).toFixed(2)) : 0,
      attentiveRatio: totalFrameDelta ? Number((attentiveFrameDelta / totalFrameDelta).toFixed(2)) : 0,
      monitoringEnabled: cameraMonitoringEnabled,
    };
  };

  const buildCameraSummary = () => {
    if (sessionMode !== "camera") {
      return {
        enabled: false,
        sessionMode: "voice_only",
        warningCount: 0,
        faceVisibleRatio: 0,
        attentiveRatio: 0,
        summaryText: "This session was completed without camera monitoring.",
      };
    }

    const stats = cameraStatsRef.current;
    const faceVisibleRatio = stats.totalFrames ? Number((stats.faceDetectedFrames / stats.totalFrames).toFixed(2)) : 0;
    const attentiveRatio = stats.totalFrames ? Number((stats.attentiveFrames / stats.totalFrames).toFixed(2)) : 0;

    return {
      enabled: true,
      sessionMode: "camera",
      warningCount: cameraWarningCount,
      faceVisibleRatio,
      attentiveRatio,
      summaryText: `${getCameraAttentionLabel(attentiveRatio)}. Face was visible for ${formatPercent(faceVisibleRatio)} of monitored frames and ${cameraWarningCount} warning(s) were shown.`,
      events: cameraEventLog,
    };
  };

  const buildAnswerPayload = () => {
    const endedAt = Date.now();
    const startedAt = answerStartRef.current || endedAt;

    return {
      questionId: currentQuestion.id,
      question: currentQuestion.question,
      interviewType,
      transcript: currentAnswer.trim(),
      startedAt,
      endedAt,
      durationSeconds: Math.max(1, Math.round((endedAt - startedAt) / 1000)),
      order: currentQuestionIndex + 1,
      timestamp: new Date().toISOString(),
      metrics: {
        speechRecognitionSupported: speechSupported,
        recordingSessions,
        transcriptUpdates,
      },
      cameraMetrics: buildCameraMetricsForAnswer(),
    };
  };

  const moveToNextQuestion = async () => {
    if (!currentAnswer.trim()) {
      setError("Please answer the question before moving ahead.");
      return;
    }

    const nextAnswers = [...answers, buildAnswerPayload()];
    setAnswers(nextAnswers);
    setCurrentAnswer("");
    setRecordingSessions(0);
    setTranscriptUpdates(0);

    if (recognition && isRecording) {
      recognition.stop();
    }

    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      setTimeout(() => {
        speakQuestion(questions[nextIndex]?.question);
        beginAnswerTimer();
      }, 300);
      return;
    }

    setLoading(true);
    setStatusMessage("Evaluating all answers and preparing your report...");

    try {
      const result = await evaluateInterview({
        candidateProfile,
        interviewType,
        questions,
        answers: nextAnswers,
      });
      const completedAt = new Date().toISOString();
      const rewardUpdate = applySessionRewards({
        gamification: normalizedUserData.gamification,
        sessionScore: result.overallScore,
        completedAt,
        dailyChallenge: sessionChallengeContext,
      });

      const cameraSummary = buildCameraSummary();
      const finalResult = {
        ...result,
        rewardSummary: rewardUpdate.rewardSummary,
        cameraSummary,
        questionByQuestionAnalysis: result.questionByQuestionAnalysis.map((analysis, index) => ({
          ...analysis,
          cameraMetrics: nextAnswers[index]?.cameraMetrics || { enabled: false, sessionMode: "voice_only" },
        })),
      };

      setInterviewResult(finalResult);
      setStep("results");

      const sessionRecord = {
        date: completedAt,
        userEmail: currentUser?.email || "",
        candidateName: candidateProfile?.fullName || `${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`.trim(),
        resumeFileName: resumeUpload?.fileName || "",
        type: interviewType,
        sessionMode,
        cameraMonitoring: sessionMode === "camera",
        cameraWarningCount,
        cameraSummary,
        score: finalResult.overallScore,
        rating: finalResult.rating,
        questions: questions.length,
        result: finalResult,
        ...rewardUpdate.sessionReward,
      };

      if (saveInterviewProgress) {
        await saveInterviewProgress({
          session: sessionRecord,
          userDataPatch: {
            gamification: rewardUpdate.gamification,
            latestCompletedSessionAt: completedAt,
          },
        });
      } else {
        await saveUserData({
          gamification: rewardUpdate.gamification,
          latestCompletedSessionAt: completedAt,
        });
        await addSessionToHistory(sessionRecord);
      }

      stopCameraStream();
    } catch (evaluationError) {
      setError(evaluationError.message || "Evaluation failed.");
    } finally {
      setLoading(false);
      setStatusMessage("");
    }
  };
  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">Interview System</p>
            <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">Resume-based interview with optional camera monitoring</h2>
            <p className="mt-2 max-w-2xl text-slate-600 dark:text-slate-300">
              Upload a resume, choose your round, decide whether to use camera monitoring, then answer one question at
              a time with live voice transcription.
            </p>
          </div>
          <button onClick={resetInterviewState} className="secondary-button">
            Reset Interview
          </button>
        </div>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      {loading ? <LoadingPanel title={statusMessage || "Processing..."} /> : null}
      {showInstructionsModal ? (
        <InstructionModal
          sessionMode={sessionMode}
          compatibilityReport={compatibilityReport}
          compatibilityChecking={compatibilityChecking}
          canStartSession={compatibilityPassed}
          compatibilityMessage={compatibilityMessage}
          onClose={() => setShowInstructionsModal(false)}
          onConfirm={startInterview}
          onRunCompatibilityCheck={runCompatibilityCheck}
        />
      ) : null}

      {!loading && (step === "upload" || step === "select") ? (
        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            {(step === "upload" || step === "select") && (
              <div className="space-y-6">
                {activeChallenge ? (
                  <section className="rounded-3xl border border-cyan-200 bg-cyan-50 p-5 dark:border-cyan-500/30 dark:bg-cyan-500/10">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-cyan-700 dark:text-cyan-300">Daily Challenge Active</p>
                        <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">{activeChallenge.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{activeChallenge.description}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
                        <span className="rounded-full bg-white px-3 py-2 text-cyan-700 dark:bg-slate-900 dark:text-cyan-200">
                          {activeChallenge.interviewType}
                        </span>
                        <span className="rounded-full bg-white px-3 py-2 text-cyan-700 dark:bg-slate-900 dark:text-cyan-200">
                          {activeChallenge.sessionMode === "camera" ? "Camera" : "Voice Only"}
                        </span>
                      </div>
                    </div>
                    <p className="mt-4 text-sm font-medium text-cyan-700 dark:text-cyan-200">
                      {isChallengeConfigured
                        ? "Your current setup matches the daily challenge. Completing this run will count toward your streak."
                        : "Your current setup no longer matches the daily challenge, so this run will be saved as a regular session."}
                    </p>
                  </section>
                ) : null}

                <section className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                    <Upload className="h-7 w-7" />
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-slate-900 dark:text-slate-100">Upload Resume</h3>
                  <p className="mt-2 text-slate-600 dark:text-slate-300">Accepted formats: PDF, DOCX, and TXT. Maximum size: 10 MB.</p>

                  <label className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700">
                    <Upload className="h-4 w-4" />
                    {resumeUpload?.fileName ? "Replace Resume" : "Choose Resume"}
                    <input type="file" className="hidden" accept=".pdf,.docx,.txt" onChange={handleResumeSelection} />
                  </label>

                  {resumeUpload?.fileName ? (
                    <p className="mt-4 text-sm font-medium text-emerald-700 dark:text-emerald-300">Uploaded: {resumeUpload.fileName}</p>
                  ) : null}
                </section>

                {candidateProfile ? (
                  <section className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Extracted Candidate Summary</h3>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                        Auto extracted
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SummaryRow label="Name" value={candidateProfile.fullName || "Not found"} />
                      <SummaryRow label="Email" value={candidateProfile.email || "Not found"} />
                      <SummaryRow label="Phone" value={candidateProfile.phone || "Not found"} />
                      <SummaryRow label="Location" value={candidateProfile.location || "Not found"} />
                    </div>
                    <SummaryRow label="Summary" value={candidateProfile.summary || "No summary extracted"} />
                    <TagList title="Skills" items={cleanSkills(candidateProfile.skills)} emptyLabel="No clear skills found" />
                    <SimpleList title="Projects" items={candidateProfile.projects} emptyLabel="No projects extracted" />
                    <SimpleList title="Achievements" items={candidateProfile.achievements} emptyLabel="No achievements extracted" />
                  </section>
                ) : null}

                {candidateProfile ? (
                  <section className="space-y-4">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Choose Interview Type</h3>
                    <div className="grid gap-4 md:grid-cols-3">
                      <InterviewTypeCard type="HR" label="HR Interview" description="Behavioral, communication, teamwork, goals, and confidence." active={interviewType === "HR"} onClick={() => setInterviewType("HR")} />
                      <InterviewTypeCard type="Technical" label="Technical Interview" description="Skills, tools, projects, debugging, implementation, and fundamentals." active={interviewType === "Technical"} onClick={() => setInterviewType("Technical")} />
                      <InterviewTypeCard type="Combined" label="Combined Interview" description="A full 10-question round with 5 technical and 5 HR questions." active={interviewType === "Combined"} onClick={() => setInterviewType("Combined")} />
                    </div>

                    <h3 className="pt-2 text-xl font-bold text-slate-900 dark:text-slate-100">Choose Session Mode</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <SessionModeCard mode="camera" label="Camera Interview" description="Open the webcam, show a live preview, and warn if the face is missing or turned away." active={sessionMode === "camera"} onClick={() => setSessionMode("camera")} icon={<Camera className="h-5 w-5" />} />
                      <SessionModeCard mode="voice_only" label="Voice-Only Interview" description="Run the interview without camera monitoring and use voice transcription only." active={sessionMode === "voice_only"} onClick={() => setSessionMode("voice_only")} icon={<CameraOff className="h-5 w-5" />} />
                    </div>

                    <button onClick={openInstructionModal} disabled={!INTERVIEW_TYPES.includes(interviewType) || !SESSION_MODES.includes(sessionMode)} className="primary-button disabled:opacity-50">
                      {isChallengeConfigured ? "Review Instructions & Start Daily Challenge" : "Review Instructions & Start"}
                    </button>
                  </section>
                ) : null}
              </div>
            )}

          </div>

          <div className="space-y-6">
            <InfoPanel title="Flow" items={["1. Upload resume", "2. Choose interview type", "3. Choose camera or voice-only mode", "4. Read the instruction popup before the first question", "5. Answer 10 questions one by one and receive a full report"]} />
            <InfoPanel title="Camera Rules" items={["Camera mode shows a live preview and checks whether your face stays visible.", "Warnings appear if the face is missing or the head turns away for a short sustained period.", "Warnings do not stop the interview. They are informational in this version."]} />
            <InfoPanel title="Voice Notes" items={[speechSupported ? "Speech recognition detected in this browser." : "Voice input unavailable in this browser.", "English-only interview flow for this version.", "You can still type answers manually if microphone capture is weak."]} />
          </div>
        </div>
      ) : null}

      {!loading && step === "interview" ? (
        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          {currentQuestion ? (
            <div className="space-y-6">
              {headWarningVisible ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                  {headWarningMessage}
                </div>
              ) : null}

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">Question {currentQuestionIndex + 1} of {questions.length}</span>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">{interviewType}</span>
                    <span className="rounded-full bg-indigo-600 px-3 py-1 text-xs font-semibold text-white">{sessionMode === "camera" ? "Camera Mode" : "Voice-Only Mode"}</span>
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-slate-900 transition-all dark:bg-slate-100" style={{ width: `${progress}%` }} />
                </div>
              </div>

              <div className={`grid gap-6 ${sessionMode === "camera" ? "xl:grid-cols-[1.1fr_0.9fr]" : ""}`}>
                <div className="space-y-6">
                  <div className="rounded-3xl bg-slate-900 p-6 text-white">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.2em] text-slate-300">Question</p>
                        <h3 className="mt-3 text-2xl font-bold leading-snug">{currentQuestion.question}</h3>
                      </div>
                      <button onClick={() => speakQuestion(currentQuestion.question)} className="secondary-button border-white/20 text-white hover:bg-white/10">
                        <Play className="h-4 w-4" />
                        Replay
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">Your Answer Transcript</label>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{transcriptWordCount} words</span>
                    </div>
                    <textarea value={currentAnswer} onChange={(event) => setCurrentAnswer(event.target.value)} className="min-h-[220px] w-full rounded-3xl border border-slate-300 bg-white p-4 text-slate-700 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-900/10 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:focus:border-slate-300 dark:focus:ring-slate-100/10" placeholder="Speak your answer or type it here..." />
                    {isRecording ? (
                      <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 text-sm font-medium text-red-600 dark:bg-red-500/10 dark:text-red-200">
                        <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
                        Recording in progress
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-wrap gap-3">
                      <button onClick={toggleRecording} className={isRecording ? "danger-button" : "secondary-button"}>
                        {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        {isRecording ? "Stop Recording" : "Start Voice Input"}
                      </button>
                      <button onClick={() => speakQuestion(currentQuestion.question)} className="secondary-button">
                        <Play className="h-4 w-4" />
                        Speak Again
                      </button>
                    </div>
                    <button onClick={moveToNextQuestion} className="primary-button">
                      {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Interview"}
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {sessionMode === "camera" ? (
                  <div className="space-y-4">
                    <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-xl">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live Camera</p>
                          <p className="mt-1 text-sm text-slate-300">{cameraStatusText}</p>
                        </div>
                        <div className={`rounded-full px-3 py-1 text-xs font-semibold ${cameraTrackingReady ? "bg-emerald-500/20 text-emerald-200" : "bg-amber-500/20 text-amber-200"}`}>
                          {cameraTrackingReady ? "Tracking Active" : "Preparing"}
                        </div>
                      </div>

                      <div className="overflow-hidden rounded-3xl bg-black ring-1 ring-white/10">
                        <video ref={videoRef} autoPlay playsInline muted className="aspect-video w-full scale-x-[-1] object-cover" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Warnings</p>
                        <p className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{cameraWarningCount}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
                        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">Permission</p>
                        <p className="mt-2 text-lg font-bold capitalize text-slate-900 dark:text-slate-100">{cameraPermissionStatus}</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {!loading && step === "results" && interviewResult ? (
        <ResultsView candidateProfile={candidateProfile} interviewType={interviewType} result={interviewResult} resumeFileName={resumeUpload?.fileName} onRestart={resetInterviewState} />
      ) : null}
    </div>
  );
};
