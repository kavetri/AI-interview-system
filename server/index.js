const express = require("express");
const cors = require("cors");
const multer = require("multer");
const {
  buildATSResponse,
  buildResumeResponse,
  buildQuestionResponse,
  buildEvaluationResponse,
  profileSnapshot,
} = require("./services/interviewService");

const app = express();
const port = Number(process.env.PORT || 5000);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "ai-interview-system-api" });
});

app.post("/api/interview/resume", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required." });
    }

    const payload = await buildResumeResponse(req.file);
    return res.json(payload);
  } catch (error) {
    return res.status(400).json({ error: error.message || "Failed to process resume." });
  }
});

app.post("/api/interview/questions", async (req, res) => {
  try {
    const { candidateProfile, rawText, interviewType } = req.body || {};

    if (!rawText || !interviewType) {
      return res.status(400).json({ error: "rawText and interviewType are required." });
    }

    if (!["HR", "Technical", "Combined"].includes(interviewType)) {
      return res.status(400).json({ error: "Invalid interview type." });
    }

    const payload = await buildQuestionResponse(profileSnapshot(candidateProfile || {}), rawText, interviewType);
    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate questions." });
  }
});

app.post("/api/interview/evaluate", async (req, res) => {
  try {
    const { candidateProfile, interviewType, questions, answers } = req.body || {};

    if (!Array.isArray(questions) || !Array.isArray(answers) || !interviewType) {
      return res.status(400).json({ error: "candidateProfile, interviewType, questions, and answers are required." });
    }

    const payload = await buildEvaluationResponse(
      profileSnapshot(candidateProfile || {}),
      interviewType,
      questions,
      answers
    );

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to evaluate interview." });
  }
});

app.post("/api/interview/ats-score", async (req, res) => {
  try {
    const { candidateProfile, rawText, jobDescription, fileName } = req.body || {};

    if (!rawText) {
      return res.status(400).json({ error: "rawText is required." });
    }

    const payload = await buildATSResponse(
      profileSnapshot(candidateProfile || {}),
      rawText,
      jobDescription || "",
      fileName || candidateProfile?.fileName || ""
    );

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to analyze resume for ATS." });
  }
});

app.listen(port, () => {
  console.log(`AI Interview System API running on http://localhost:${port}`);
});
