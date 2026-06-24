const fs = require("fs");
const path = require("path");
const mammoth = require("mammoth");
const { PDFParse } = require("pdf-parse");

const SUPPORTED_EXTENSIONS = [".txt", ".pdf", ".docx"];
const DATA_DIR = path.join(__dirname, "..", "data");
const SOFTWARE_DATASET_PATH = path.join(DATA_DIR, "software-questions.csv");
const FULL_INTERVIEW_DATASET_PATH = path.join(DATA_DIR, "full_interview_questions_dataset.csv");
const QA_PARQUET_PATH = path.join(DATA_DIR, "interview_questions_qa.parquet");
const HR_PARQUET_PATH = path.join(DATA_DIR, "hr_interview_dataset.parquet");
const HR_FOCUS_AREAS = [
  "self introduction",
  "motivation",
  "teamwork",
  "conflict handling",
  "leadership",
  "strengths and weaknesses",
  "career goals",
  "adaptability",
  "ownership",
  "communication",
];

const TECH_FOCUS_AREAS = [
  "core skills",
  "project architecture",
  "debugging",
  "problem solving",
  "tools and workflow",
  "databases",
  "testing",
  "version control",
  "fundamentals",
  "implementation tradeoffs",
];
const SOFTWARE_ROLE_CATEGORIES = new Set([
  "general programming",
  "data structures",
  "algorithms",
  "database and sql",
  "languages and frameworks",
  "version control",
  "software testing",
  "web development",
  "back-end",
  "front-end",
  "devops",
  "system design",
  "security",
]);
const SOFTWARE_ROLE_HINTS = [
  "software engineer",
  "software developer",
  "sde",
  "full stack",
  "frontend",
  "front-end",
  "backend",
  "back-end",
  "web developer",
  "devops",
];
const TECH_DOMAIN_HINTS = [
  "ai",
  "machine learning",
  "data science",
  "python",
  "java",
  "javascript",
  "react",
  "node",
  "sql",
  "cloud",
  "devops",
  "backend",
  "front-end",
  "frontend",
  "system design",
  "algorithms",
  "data structures",
  "oop",
  "dbms",
  "networking",
  "operating system",
  "security",
];
const QUESTION_BANK_FALLBACK = [];
let QUESTION_BANK = QUESTION_BANK_FALLBACK;
let QUESTION_BANK_READY = null;

function getExtension(fileName = "") {
  const index = fileName.lastIndexOf(".");
  return index >= 0 ? fileName.slice(index).toLowerCase() : "";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function stripBullets(text = "") {
  return text
    .replace(/^[\s\-*•]+/gm, "")
    .replace(/\r/g, "")
    .trim();
}

function normalizeWhitespace(text = "") {
  return text
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitLines(text = "") {
  return normalizeWhitespace(text)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function uniqueItems(items = []) {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function roundNumber(value, digits = 1) {
  return Number(Number(value || 0).toFixed(digits));
}

function sentenceCase(value = "") {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function safeLower(value = "") {
  return String(value || "").trim().toLowerCase();
}

function parseCsvLine(line = "") {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const nextChar = line[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((value) => value.trim());
}

function loadQuestionBank() {
  if (!fs.existsSync(SOFTWARE_DATASET_PATH)) {
    return [];
  }

  const content = fs.readFileSync(SOFTWARE_DATASET_PATH, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);

  return lines
    .slice(1)
    .map((line) => {
      const columns = parseCsvLine(line);
      const row = {};

      headers.forEach((header, index) => {
        row[header] = columns[index] || "";
      });

      return {
        id: `software-${row["Question Number"] || ""}`,
        question: row.Question || "",
        answer: row.Answer || "",
        category: row.Category || "",
        difficulty: row.Difficulty || "",
        role: "Software Engineer",
        interviewType: "Technical",
        source: "software-questions.csv",
        keywords: [],
      };
    })
    .filter((row) => row.question);
}

function parseCsvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const columns = parseCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = columns[index] || "";
    });
    return row;
  });
}

function inferInterviewType(category = "", role = "", sourceType = "") {
  const combined = safeLower(`${category} ${role} ${sourceType}`);
  const hrSignal =
    /hr|behavior|behaviour|conflict|communication|leadership|adaptability|career|motivation|teamwork|strength|weakness|self introduction/.test(
      combined
    );
  return hrSignal ? "HR" : "Technical";
}

function normalizeKeywordArray(value) {
  if (Array.isArray(value)) {
    return uniqueItems(value.map((item) => String(item || "").trim()).filter(Boolean));
  }

  if (!value) {
    return [];
  }

  return uniqueItems(
    String(value)
      .split(/[,|;/]+/g)
      .map((item) => item.trim())
      .filter(Boolean)
  );
}

function normalizeQuestionRecord(record = {}, defaults = {}) {
  const question = normalizeWhitespace(record.question || record.Question || "");
  if (!question) {
    return null;
  }

  const answer =
    normalizeWhitespace(record.answer || record.Answer || record.ideal_answer || record["Ideal Answer"] || "");
  const category =
    normalizeWhitespace(record.category || record.Category || record.domain || record.Domain || defaults.category || "");
  const role = normalizeWhitespace(record.role || record.Role || defaults.role || "");
  const difficulty = normalizeWhitespace(record.difficulty || record.Difficulty || defaults.difficulty || "");
  const interviewType = inferInterviewType(category, role, record.source_type || defaults.sourceType || "");

  return {
    id: defaults.id || record.id || "",
    question,
    answer,
    category,
    difficulty,
    role,
    interviewType,
    source: defaults.source || "dataset",
    sourceType: record.source_type || defaults.sourceType || "",
    keywords: normalizeKeywordArray(record.keywords || defaults.keywords || []),
    experience: normalizeWhitespace(record.experience || defaults.experience || ""),
  };
}

async function loadParquetRecords(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const { asyncBufferFromFile, parquetReadObjects } = await import("hyparquet");
  const file = await asyncBufferFromFile(filePath);
  return parquetReadObjects({
    file,
    rowEnd: options.rowEnd,
  });
}

async function buildUnifiedQuestionBank() {
  const softwareRows = loadQuestionBank();
  const fullInterviewRows = parseCsvFile(FULL_INTERVIEW_DATASET_PATH)
    .map((row, index) =>
      normalizeQuestionRecord(
        {
          ...row,
          answer: "",
        },
        {
          id: `full-${index + 1}`,
          source: "full_interview_questions_dataset.csv",
        }
      )
    )
    .filter(Boolean);

  const qaRows = await loadParquetRecords(QA_PARQUET_PATH, { rowEnd: 5000 })
    .then((rows) =>
      rows
        .map((row, index) =>
          normalizeQuestionRecord(row, {
            id: `qa-${index + 1}`,
            source: "interview_questions_qa.parquet",
            role: "Software Engineer",
          })
        )
        .filter(Boolean)
    )
    .catch(() => []);

  const hrRows = await loadParquetRecords(HR_PARQUET_PATH, { rowEnd: 6000 })
    .then((rows) =>
      rows
        .map((row, index) =>
          normalizeQuestionRecord(row, {
            id: `hr-${index + 1}`,
            source: "hr_interview_dataset.parquet",
          })
        )
        .filter(Boolean)
    )
    .catch(() => []);

  const merged = [...softwareRows, ...fullInterviewRows, ...qaRows, ...hrRows];
  const seen = new Set();

  return merged.filter((row) => {
    const key = safeLower(`${row.question}::${row.interviewType}`);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function ensureQuestionBankLoaded() {
  if (!QUESTION_BANK_READY) {
    QUESTION_BANK_READY = buildUnifiedQuestionBank()
      .then((rows) => {
        QUESTION_BANK = rows.length ? rows : loadQuestionBank();
        return QUESTION_BANK;
      })
      .catch(() => {
        QUESTION_BANK = loadQuestionBank();
        return QUESTION_BANK;
      });
  }

  return QUESTION_BANK_READY;
}

function extractEmail(text = "") {
  return text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
}

function extractPhone(text = "") {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/);
  return match ? match[0] : "";
}

function extractName(lines = []) {
  const candidate = lines
    .slice(0, 8)
    .find((line) =>
      /^[A-Z][a-z]+(?: [A-Z][a-z]+){1,3}$/.test(line.replace(/[^A-Za-z\s]/g, "").trim())
    );

  return candidate || "";
}

function extractLocation(lines = []) {
  const locationLine = lines.find((line) =>
    /(india|usa|united states|remote|hyderabad|bangalore|bengaluru|chennai|mumbai|pune|delhi|kolkata|noida|gurgaon|gurugram)/i.test(
      line
    )
  );
  return locationLine || "";
}

function getSection(text, sectionNames, stopSections = []) {
  const escaped = sectionNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const stop = stopSections.length
    ? stopSections.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")
    : null;
  const pattern = stop
    ? new RegExp(`(?:^|\\n)(?:${escaped.join("|")})\\s*:?\\s*\\n([\\s\\S]*?)(?=\\n(?:${stop})\\s*:?\\s*\\n|$)`, "i")
    : new RegExp(`(?:^|\\n)(?:${escaped.join("|")})\\s*:?\\s*\\n([\\s\\S]*?)$`, "i");

  const match = normalizeWhitespace(text).match(pattern);
  return match ? stripBullets(match[1]) : "";
}

function listFromSection(sectionText = "") {
  if (!sectionText) return [];
  const items = sectionText
    .split(/\n|,|;|\||•/g)
    .map((item) => item.trim())
    .filter((item) => item.length > 1);
  return uniqueItems(items);
}

function compactParagraph(sectionText = "", maxLength = 240) {
  if (!sectionText) return "";
  const compact = normalizeWhitespace(sectionText).replace(/\n/g, " ");
  return compact.slice(0, maxLength).trim();
}

function sliceTopItems(sectionText = "", count = 4) {
  return splitLines(sectionText).slice(0, count);
}

function extractCandidateProfileFromText(rawText = "", fileName = "") {
  const text = normalizeWhitespace(rawText);
  const lines = splitLines(text);
  const stopSections = [
    "education",
    "experience",
    "work experience",
    "professional experience",
    "skills",
    "technical skills",
    "projects",
    "certifications",
    "achievements",
    "awards",
    "summary",
    "objective",
  ];

  const summary =
    getSection(text, ["summary", "professional summary", "profile", "objective"], stopSections) ||
    compactParagraph(lines.slice(0, 12).join(" "), 220);

  const educationSection = getSection(text, ["education", "academic background"], stopSections);
  const experienceSection = getSection(
    text,
    ["experience", "work experience", "professional experience", "internships"],
    stopSections
  );
  const skillsSection = getSection(text, ["skills", "technical skills", "core competencies"], stopSections);
  const projectsSection = getSection(text, ["projects", "academic projects", "personal projects"], stopSections);
  const certificationsSection = getSection(text, ["certifications", "certificates", "licenses"], stopSections);
  const achievementsSection = getSection(text, ["achievements", "awards", "accomplishments"], stopSections);

  return {
    fullName: extractName(lines),
    email: extractEmail(text),
    phone: extractPhone(text),
    location: extractLocation(lines),
    summary,
    education: sliceTopItems(educationSection, 4),
    experience: sliceTopItems(experienceSection, 5),
    skills: listFromSection(skillsSection).slice(0, 20),
    projects: sliceTopItems(projectsSection, 5),
    certifications: sliceTopItems(certificationsSection, 5),
    achievements: sliceTopItems(achievementsSection, 5),
    fileName,
  };
}

function profileSnapshot(profile = {}) {
  return {
    fullName: profile.fullName || "",
    email: profile.email || "",
    phone: profile.phone || "",
    location: profile.location || "",
    summary: profile.summary || "",
    education: Array.isArray(profile.education) ? profile.education : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    fileName: profile.fileName || "",
  };
}

function getResumeKeywordPool(profile = {}, rawText = "") {
  const combined = [
    profile.summary || "",
    ...(profile.skills || []),
    ...(profile.projects || []),
    ...(profile.experience || []),
    rawText || "",
  ].join(" ");

  return uniqueItems(
    combined
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/g)
      .filter((token) => token.length > 2)
  );
}

function resumeRoleTargets(profile = {}, rawText = "") {
  const combined = safeLower(
    [
      profile.summary || "",
      ...(profile.skills || []),
      ...(profile.projects || []),
      ...(profile.experience || []),
      rawText || "",
    ].join(" ")
  );

  return SOFTWARE_ROLE_HINTS.filter((item) => combined.includes(item));
}

function scoreDatasetQuestion(row, keywords = []) {
  const haystack = safeLower(
    `${row.question} ${row.answer} ${row.category} ${row.difficulty} ${row.role} ${row.keywords?.join(" ")}`
  );
  const matchScore = keywords.reduce((score, keyword) => score + (haystack.includes(keyword) ? 2 : 0), 0);
  const categoryBoost =
    SOFTWARE_ROLE_CATEGORIES.has(safeLower(row.category)) || TECH_DOMAIN_HINTS.includes(safeLower(row.category)) ? 3 : 0;
  const difficultyBoost = /medium|hard/i.test(row.difficulty) ? 1 : 0;
  return matchScore + categoryBoost + difficultyBoost;
}

function selectDatasetQuestions(profile = {}, rawText = "", interviewType = "Technical", limit = 10) {
  const keywords = getResumeKeywordPool(profile, rawText);
  const roleTargets = resumeRoleTargets(profile, rawText);
  const ranked = QUESTION_BANK
    .map((row) => ({
      ...row,
      score:
        scoreDatasetQuestion(row, keywords) +
        (roleTargets.some((target) => safeLower(row.role).includes(target)) ? 4 : 0) +
        (interviewType === "HR" && row.interviewType === "HR" ? 6 : 0) +
        (interviewType === "Technical" && row.interviewType === "Technical" ? 6 : 0) +
        (interviewType === "Combined" ? 2 : 0),
    }))
    .filter((row) => {
      if (interviewType === "HR") {
        return row.interviewType === "HR";
      }
      if (interviewType === "Technical") {
        return row.interviewType === "Technical";
      }
      return true;
    })
    .sort((left, right) => right.score - left.score);

  const picked = [];
  const seenQuestions = new Set();

  for (const row of ranked) {
    if (picked.length >= limit) {
      break;
    }

    const key = safeLower(row.question);
    if (seenQuestions.has(key)) {
      continue;
    }

    seenQuestions.add(key);
    picked.push(row);
  }

  return picked;
}

function selectCombinedDatasetQuestions(profile = {}, rawText = "", techCount = 5, hrCount = 5) {
  return {
    technical: selectDatasetQuestions(profile, rawText, "Technical", techCount),
    hr: selectDatasetQuestions(profile, rawText, "HR", hrCount),
  };
}

async function callOpenRouter(messages, { temperature = 0.2, maxTokens = 1800 } = {}) {
  const apiKey = process.env.OPENROUTER_API_KEY || process.env.REACT_APP_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OpenRouter API key");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.APP_ORIGIN || "http://localhost:3000",
      "X-Title": "AI Interview System",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL || process.env.REACT_APP_MODEL_NAME || "openai/gpt-4o-mini",
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

function extractFirstJsonBlock(text = "") {
  const objectMatch = text.match(/\{[\s\S]*\}/);
  if (objectMatch) return objectMatch[0];
  const arrayMatch = text.match(/\[[\s\S]*\]/);
  return arrayMatch ? arrayMatch[0] : "";
}

async function maybeEnhanceProfileWithAI(rawText, baseProfile) {
  try {
    const content = await callOpenRouter(
      [
        {
          role: "system",
          content:
            "You extract resume information. Return only valid JSON with the requested fields. Keep unknown fields empty or empty arrays. Do not invent facts.",
        },
        {
          role: "user",
          content: `Extract this resume into JSON with fields:
{
  "fullName": "",
  "email": "",
  "phone": "",
  "location": "",
  "summary": "",
  "education": [],
  "experience": [],
  "skills": [],
  "projects": [],
  "certifications": [],
  "achievements": []
}

Resume text:
${rawText.slice(0, 9000)}`,
        },
      ],
      { temperature: 0.1, maxTokens: 1600 }
    );

    const json = extractFirstJsonBlock(content);
    if (!json) return baseProfile;
    const parsed = JSON.parse(json);

    return profileSnapshot({
      ...baseProfile,
      ...parsed,
      education: Array.isArray(parsed.education) && parsed.education.length ? parsed.education : baseProfile.education,
      experience: Array.isArray(parsed.experience) && parsed.experience.length ? parsed.experience : baseProfile.experience,
      skills: Array.isArray(parsed.skills) && parsed.skills.length ? parsed.skills : baseProfile.skills,
      projects: Array.isArray(parsed.projects) && parsed.projects.length ? parsed.projects : baseProfile.projects,
      certifications:
        Array.isArray(parsed.certifications) && parsed.certifications.length
          ? parsed.certifications
          : baseProfile.certifications,
      achievements:
        Array.isArray(parsed.achievements) && parsed.achievements.length
          ? parsed.achievements
          : baseProfile.achievements,
    });
  } catch (error) {
    return baseProfile;
  }
}

function createQuestion(id, question, type, focusArea) {
  return { id: `q-${id}`, question, type, focusArea };
}

function hrQuestionTemplates(profile) {
  const project = profile.projects[0] || "a project from your resume";
  const achievement = profile.achievements[0] || "an achievement you are proud of";
  const experience = profile.experience[0] || "one of your experiences";
  return [
    `Tell me about yourself and how your background prepares you for this opportunity.`,
    `Why do you want this role, and what motivates you about this type of work?`,
    `Describe a time during ${project} when you had to work closely with others. What was your contribution?`,
    `Tell me about a challenge you faced in ${experience}. How did you handle it?`,
    `What would you say is your biggest strength, and how has it helped you in your work or studies?`,
    `Tell me about a time you received feedback or criticism. What did you do with it?`,
    `Which achievement from your resume, such as ${achievement}, best represents your potential and why?`,
    `Describe a situation where you had multiple priorities. How did you manage your time?`,
    `What type of work environment helps you perform at your best?`,
    `Where do you see yourself growing in the next few years, and how are you preparing for that now?`,
  ];
}

function technicalQuestionTemplates(profile) {
  const skills = profile.skills.slice(0, 4);
  const project = profile.projects[0] || "your most relevant project";
  const skillA = skills[0] || "your strongest technical skill";
  const skillB = skills[1] || "another tool or technology you have used";
  return [
    `Walk me through ${project}. What problem were you solving, and what was your technical approach?`,
    `Which parts of ${skillA} are you most comfortable with, and where have you applied them practically?`,
    `Tell me about a technical bug or blocker you faced. How did you debug and resolve it?`,
    `How do you decide between different implementation approaches when building a feature or project?`,
    `What tools, libraries, or platforms like ${skillB} have you used, and why did you choose them?`,
    `How do you make sure your code is reliable, readable, and maintainable?`,
    `Explain one technical concept from your resume in a way that a teammate or interviewer can follow clearly.`,
    `What database, API, or data-handling work have you done, and what challenges did you face?`,
    `How do you use version control or collaboration practices when working on projects?`,
    `If you were given more time, what would you improve technically in ${project}?`,
  ];
}

function datasetQuestionToPromptItem(row) {
  return {
    question: row.question,
    category: row.category,
    difficulty: row.difficulty,
    answerHint: row.answer,
  };
}

function datasetQuestionToInterviewQuestion(row, id, type = "Technical") {
  return {
    id: `q-${id}`,
    question: row.question,
    type,
    focusArea: `${row.category || "Software Engineering"}${row.difficulty ? ` - ${row.difficulty}` : ""}`,
  };
}

function buildTechnicalQuestionSet(profile, rawText, count = 10) {
  const datasetRows = selectDatasetQuestions(profile, rawText, "Technical", count);
  const templateRows = technicalQuestionTemplates(profile).map((question, index) =>
    createQuestion(index + 1, question, "Technical", TECH_FOCUS_AREAS[index] || "technical")
  );

  const questions = datasetRows.map((row, index) => datasetQuestionToInterviewQuestion(row, index + 1, "Technical"));
  const seen = new Set(questions.map((item) => safeLower(item.question)));

  for (const item of templateRows) {
    if (questions.length >= count) break;
    const key = safeLower(item.question);
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({ ...item, id: `q-${questions.length + 1}` });
  }

  return questions.slice(0, count);
}

function buildHRQuestionSet(profile, rawText, count = 10) {
  const datasetRows = selectDatasetQuestions(profile, rawText, "HR", count);
  const templateRows = hrQuestionTemplates(profile).map((question, index) =>
    createQuestion(index + 1, question, "HR", HR_FOCUS_AREAS[index] || "hr")
  );

  const questions = datasetRows.map((row, index) => datasetQuestionToInterviewQuestion(row, index + 1, "HR"));
  const seen = new Set(questions.map((item) => safeLower(item.question)));

  for (const item of templateRows) {
    if (questions.length >= count) break;
    const key = safeLower(item.question);
    if (seen.has(key)) continue;
    seen.add(key);
    questions.push({ ...item, id: `q-${questions.length + 1}` });
  }

  return questions.slice(0, count);
}

async function generateQuestionsWithAI(profile, rawText, interviewType) {
  const datasetContext =
    interviewType === "Combined"
      ? [
          ...selectDatasetQuestions(profile, rawText, "Technical", 6),
          ...selectDatasetQuestions(profile, rawText, "HR", 6),
        ].map(datasetQuestionToPromptItem)
      : selectDatasetQuestions(profile, rawText, interviewType, 12).map(datasetQuestionToPromptItem);
  const messages = [
    {
      role: "system",
      content:
        "You are an interview designer. Return only valid JSON. Produce exactly 10 interview questions based on the candidate profile and resume. Every question must be specific to the resume and professional for a campus-placement style interview.",
    },
    {
      role: "user",
      content: `Return JSON in this shape:
{
  "questions": [
    { "id": "q-1", "question": "", "type": "${interviewType}", "focusArea": "" }
  ]
}

Interview type: ${interviewType}
Candidate profile: ${JSON.stringify(profile)}
Resume text: ${rawText.slice(0, 8000)}
Dataset question bank for software developer / software engineer roles:
${JSON.stringify(datasetContext)}

Rules:
- exactly 10 questions
- HR: behavioral and communication
- Technical: technical, projects, problem-solving, and software-engineering fundamentals
- Combined: 5 technical then 5 HR
- for Technical and Combined, use the dataset context as a strong source of software-engineer question ideas
- adapt dataset topics to the candidate's resume, skills, projects, and experience
- no duplicate questions
- no generic filler questions unless grounded in resume content`,
    },
  ];

  const content = await callOpenRouter(messages, { temperature: 0.3, maxTokens: 1800 });
  const json = extractFirstJsonBlock(content);
  if (!json) {
    throw new Error("No question JSON returned");
  }

  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.questions) || parsed.questions.length !== 10) {
    throw new Error("Invalid question payload");
  }

  return parsed.questions.map((question, index) => ({
    id: question.id || `q-${index + 1}`,
    question: question.question,
    type: question.type || interviewType,
    focusArea: question.focusArea || "",
  }));
}

function generateFallbackQuestions(profile, rawText, interviewType) {
  const hr = buildHRQuestionSet(profile, rawText, 10);
  const tech = buildTechnicalQuestionSet(profile, rawText, 10);

  if (interviewType === "HR") return hr;
  if (interviewType === "Technical") return tech;

  const combined = selectCombinedDatasetQuestions(profile, rawText, 5, 5);
  const combinedTechnical = combined.technical.map((row, index) => ({
    ...datasetQuestionToInterviewQuestion(row, index + 1, "Combined"),
  }));
  const combinedHR = combined.hr.map((row, index) => ({
    ...datasetQuestionToInterviewQuestion(row, index + 6, "Combined"),
  }));

  if (combinedTechnical.length >= 3 && combinedHR.length >= 3) {
    return [...combinedTechnical, ...combinedHR].slice(0, 10);
  }

  return [
    ...tech.slice(0, 5).map((question, index) => ({ ...question, id: `q-${index + 1}`, type: "Combined" })),
    ...hr.slice(0, 5).map((question, index) => ({ ...question, id: `q-${index + 6}`, type: "Combined" })),
  ];
}

function keywordBag(text = "") {
  return uniqueItems(
    text
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/g)
      .filter((item) => item.length > 3)
  );
}

function fillerCount(text = "") {
  const matches = text.toLowerCase().match(/\b(um|uh|like|you know|actually|basically|sort of|kind of)\b/g);
  return matches ? matches.length : 0;
}

function countSentences(text = "") {
  return text.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean).length;
}

function words(text = "") {
  return text.trim().split(/\s+/).filter(Boolean);
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ATS_STOPWORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "any",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "by",
  "can",
  "college",
  "company",
  "currently",
  "data",
  "degree",
  "details",
  "did",
  "do",
  "for",
  "from",
  "good",
  "have",
  "help",
  "high",
  "i",
  "in",
  "into",
  "is",
  "it",
  "job",
  "knowledge",
  "looking",
  "my",
  "of",
  "on",
  "or",
  "our",
  "project",
  "projects",
  "related",
  "responsible",
  "role",
  "skills",
  "strong",
  "team",
  "that",
  "the",
  "their",
  "them",
  "this",
  "to",
  "using",
  "various",
  "very",
  "was",
  "we",
  "with",
  "work",
  "worked",
  "you",
]);

const ATS_ACTION_VERBS = [
  "achieved",
  "automated",
  "built",
  "collaborated",
  "created",
  "delivered",
  "designed",
  "developed",
  "drove",
  "implemented",
  "improved",
  "increased",
  "launched",
  "led",
  "managed",
  "optimized",
  "owned",
  "reduced",
  "resolved",
  "streamlined",
  "tested",
];

const ATS_WEAK_PHRASES = [
  {
    pattern: /\bresponsible for\b/gi,
    issue: "Weak ownership wording",
    severity: "high",
    suggestion: "Use a direct action verb and describe the outcome.",
    replacement: "Led or delivered a specific task with a measurable result",
  },
  {
    pattern: /\bworked on\b/gi,
    issue: "Vague contribution statement",
    severity: "high",
    suggestion: "Name what you built, improved, or solved instead of saying you worked on it.",
    replacement: "Built or implemented a named feature, system, or workflow",
  },
  {
    pattern: /\bhelped\b/gi,
    issue: "Contribution sounds secondary",
    severity: "medium",
    suggestion: "Clarify your exact responsibility and the impact you created.",
    replacement: "Supported or coordinated a defined task with a concrete result",
  },
  {
    pattern: /\bgood communication skills\b/gi,
    issue: "Soft skill claim without evidence",
    severity: "medium",
    suggestion: "Replace the claim with proof such as presentations, stakeholder updates, or teamwork outcomes.",
    replacement: "Presented updates, documented decisions, or coordinated with stakeholders",
  },
  {
    pattern: /\bhardworking\b/gi,
    issue: "Generic adjective without evidence",
    severity: "low",
    suggestion: "Show effort through outcomes, ownership, or delivery under constraints.",
    replacement: "Delivered work under deadlines or handled multiple priorities successfully",
  },
  {
    pattern: /\bpassionate\b/gi,
    issue: "Subjective claim without proof",
    severity: "low",
    suggestion: "Anchor motivation in projects, learning, or outcomes.",
    replacement: "Built side projects, completed certifications, or improved a process",
  },
  {
    pattern: /\bdynamic\b/gi,
    issue: "Buzzword-heavy wording",
    severity: "low",
    suggestion: "Use plain language and focus on real responsibilities.",
    replacement: "Adapted to changing priorities while completing specific deliverables",
  },
  {
    pattern: /\bexcellent\b/gi,
    issue: "Unsubstantiated superlative",
    severity: "low",
    suggestion: "Replace superlatives with evidence or numbers.",
    replacement: "Improved a measurable metric, quality target, or delivery speed",
  },
  {
    pattern: /\bbest\b/gi,
    issue: "Unsubstantiated superlative",
    severity: "low",
    suggestion: "Avoid exaggerated claims unless they are tied to awards or metrics.",
    replacement: "Ranked, awarded, or measured result with evidence",
  },
];

function answerKeywordSource(question, profile) {
  return keywordBag(
    `${question} ${profile.summary || ""} ${profile.skills.join(" ")} ${profile.projects.join(" ")} ${profile.experience.join(" ")}`
  );
}

function findBestReferenceForQuestion(question = {}, profile = {}) {
  const questionKey = safeLower(question.question);
  const focusKey = safeLower(question.focusArea);
  const profileKeywords = getResumeKeywordPool(profile, "");

  const ranked = QUESTION_BANK.map((row) => {
    const rowKey = safeLower(row.question);
    const rowHaystack = safeLower(`${row.question} ${row.answer} ${row.category} ${row.role} ${row.keywords.join(" ")}`);
    let score = 0;

    if (rowKey === questionKey) score += 30;
    if (rowKey.includes(questionKey) || questionKey.includes(rowKey)) score += 18;
    if (focusKey && safeLower(row.category).includes(focusKey)) score += 8;
    if (question.type === "HR" && row.interviewType === "HR") score += 8;
    if (question.type !== "HR" && row.interviewType === "Technical") score += 5;
    score += profileKeywords.reduce((sum, keyword) => sum + (rowHaystack.includes(keyword) ? 1 : 0), 0);

    return { ...row, score };
  })
    .filter((row) => row.score > 0 && row.answer)
    .sort((left, right) => right.score - left.score);

  return ranked[0] || null;
}

function overlapCount(sourceTerms = [], targetTerms = []) {
  const targetSet = new Set(targetTerms.map(normalizeKeyword).filter(Boolean));
  return uniqueItems(sourceTerms.map(normalizeKeyword).filter(Boolean)).filter((term) => targetSet.has(term)).length;
}

function buildReferenceCoverage(referenceKeywords = [], answerKeywords = []) {
  if (!referenceKeywords.length) {
    return {
      ratio: 0,
      matched: [],
      missing: [],
    };
  }

  const normalizedReference = uniqueItems(referenceKeywords.map(normalizeKeyword).filter(Boolean));
  const normalizedAnswer = uniqueItems(answerKeywords.map(normalizeKeyword).filter(Boolean));
  const answerSet = new Set(normalizedAnswer);
  const matched = normalizedReference.filter((term) => answerSet.has(term));
  const missing = normalizedReference.filter((term) => !answerSet.has(term));

  return {
    ratio: matched.length / Math.max(normalizedReference.length, 1),
    matched,
    missing,
  };
}

function normalizeKeyword(term = "") {
  return term.toLowerCase().replace(/[^a-z0-9+#./ -]/g, "").replace(/\s+/g, " ").trim();
}

function extractImportantTerms(text = "", limit = 25) {
  const normalized = normalizeWhitespace(text).toLowerCase();
  const tokens = normalized
    .split(/[^a-z0-9+#./-]+/g)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !ATS_STOPWORDS.has(token));
  const frequency = tokens.reduce((accumulator, token) => {
    accumulator[token] = (accumulator[token] || 0) + 1;
    return accumulator;
  }, {});

  return Object.entries(frequency)
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([term]) => term);
}

function collectGenericExpectedKeywords(profile = {}) {
  const seeded = [
    ...profile.skills,
    ...profile.projects.flatMap((item) => extractImportantTerms(item, 4)),
    ...profile.experience.flatMap((item) => extractImportantTerms(item, 4)),
    ...profile.education.flatMap((item) => extractImportantTerms(item, 3)),
    ...ATS_ACTION_VERBS.slice(0, 10),
    "teamwork",
    "communication",
    "analysis",
    "testing",
  ];

  return uniqueItems(
    seeded
      .map((item) => normalizeKeyword(item))
      .filter((item) => item && item.length > 2 && !ATS_STOPWORDS.has(item))
  ).slice(0, 30);
}

function findKeywordMentions(rawText = "", terms = []) {
  const haystack = ` ${normalizeWhitespace(rawText).toLowerCase()} `;
  return terms.filter((term) => {
    const normalized = normalizeKeyword(term);
    if (!normalized) return false;
    const pattern = new RegExp(`(^|[^a-z0-9+#./-])${escapeRegExp(normalized)}([^a-z0-9+#./-]|$)`, "i");
    return pattern.test(haystack);
  });
}

function countTermOccurrences(rawText = "", term = "") {
  const normalizedText = ` ${normalizeWhitespace(rawText).toLowerCase()} `;
  const normalizedTerm = normalizeKeyword(term);
  if (!normalizedTerm) return 0;
  const pattern = new RegExp(`(^|[^a-z0-9+#./-])${escapeRegExp(normalizedTerm)}([^a-z0-9+#./-]|$)`, "gi");
  const matches = normalizedText.match(pattern);
  return matches ? matches.length : 0;
}

function scoreRatio(found, total) {
  if (!total) return 0;
  return clamp((found / total) * 100, 0, 100);
}

function detectSectionForSnippet(rawText = "", snippet = "") {
  const normalizedText = normalizeWhitespace(rawText);
  const normalizedSnippet = normalizeKeyword(snippet);
  if (!normalizedSnippet) return "general";
  const index = normalizedText.toLowerCase().indexOf(normalizedSnippet);
  if (index < 0) return "general";
  const priorText = normalizedText.slice(0, index);
  const headings = [
    "experience",
    "work experience",
    "professional experience",
    "projects",
    "skills",
    "technical skills",
    "education",
    "certifications",
    "summary",
    "objective",
    "achievements",
  ];
  for (let headingIndex = headings.length - 1; headingIndex >= 0; headingIndex -= 1) {
    const heading = headings[headingIndex];
    const position = priorText.toLowerCase().lastIndexOf(heading);
    if (position >= 0) {
      return heading.includes("experience")
        ? "experience"
        : heading.includes("skills")
        ? "skills"
        : heading.includes("project")
        ? "projects"
        : heading;
    }
  }
  return "general";
}

function analyzeFormatting(rawText = "") {
  const lines = splitLines(rawText);
  const longLines = lines.filter((line) => line.length > 140).length;
  const symbolNoise = (rawText.match(/[|]{2,}|[_]{3,}|[~]{2,}|[•]{2,}|[:]{3,}/g) || []).length;
  const tableLike = lines.filter((line) => /\s{4,}\S+\s{4,}/.test(line) || line.includes("|")).length;
  const bulletStyles = new Set(
    lines
      .map((line) => {
        const match = line.match(/^([-*•])\s+/);
        return match ? match[1] : "";
      })
      .filter(Boolean)
  );
  const denseParagraphs = normalizeWhitespace(rawText)
    .split("\n\n")
    .filter((paragraph) => paragraph.length > 420 && countSentences(paragraph) <= 3).length;

  const formattingScore = clamp(
    100 - longLines * 6 - symbolNoise * 10 - tableLike * 7 - Math.max(0, bulletStyles.size - 1) * 8 - denseParagraphs * 12,
    20,
    100
  );
  const readabilityScore = clamp(
    100 - denseParagraphs * 15 - longLines * 4 - tableLike * 6 - symbolNoise * 8,
    20,
    100
  );

  return {
    formattingScore,
    readabilityScore,
    longLines,
    symbolNoise,
    tableLike,
    denseParagraphs,
    inconsistentBullets: Math.max(0, bulletStyles.size - 1),
  };
}

function analyzeSections(profile = {}) {
  const sectionAnalysis = {
    contact: {
      present: Boolean(profile.fullName && profile.email && profile.phone),
      notes: [],
    },
    summary: {
      present: Boolean(profile.summary),
      notes: [],
    },
    skills: {
      present: Boolean(profile.skills.length),
      notes: [],
    },
    experience: {
      present: Boolean(profile.experience.length),
      notes: [],
    },
    projects: {
      present: Boolean(profile.projects.length),
      notes: [],
    },
    education: {
      present: Boolean(profile.education.length),
      notes: [],
    },
    certifications: {
      present: Boolean(profile.certifications.length),
      notes: [],
    },
  };

  if (!profile.fullName) sectionAnalysis.contact.notes.push("Name is missing.");
  if (!profile.email) sectionAnalysis.contact.notes.push("Email is missing.");
  if (!profile.phone) sectionAnalysis.contact.notes.push("Phone number is missing.");
  if (profile.summary && profile.summary.length < 50) sectionAnalysis.summary.notes.push("Summary is present but very short.");
  if (!profile.skills.length) sectionAnalysis.skills.notes.push("No dedicated skills section found.");
  if (!profile.experience.length) sectionAnalysis.experience.notes.push("No experience section found.");
  if (!profile.projects.length) sectionAnalysis.projects.notes.push("No projects section found.");
  if (!profile.education.length) sectionAnalysis.education.notes.push("No education section found.");
  if (!profile.certifications.length) sectionAnalysis.certifications.notes.push("Certifications not found.");

  const required = ["contact", "summary", "skills", "experience", "education"];
  const presentCount = required.filter((key) => sectionAnalysis[key].present).length;
  const sectionCompletenessScore = clamp(scoreRatio(presentCount, required.length), 0, 100);

  return { sectionAnalysis, sectionCompletenessScore };
}

function analyzeExperienceQuality(profile = {}) {
  const combined = [...profile.experience, ...profile.projects].join(" ");
  const actionVerbHits = ATS_ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(combined)).length;
  const quantifiedHits = (combined.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const score = clamp((actionVerbHits * 12) + (quantifiedHits * 10) + (profile.experience.length ? 20 : 0) + (profile.projects.length ? 15 : 0), 10, 100);

  return {
    score,
    actionVerbHits,
    quantifiedHits,
  };
}

function analyzeAchievementsImpact(profile = {}) {
  const achievementText = [...profile.achievements, ...profile.experience, ...profile.projects].join(" ");
  const quantifiedHits = (achievementText.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;
  const score = clamp((profile.achievements.length ? 35 : 10) + quantifiedHits * 12 + (profile.projects.length ? 15 : 0), 10, 100);

  return {
    score,
    quantifiedHits,
  };
}

function analyzeGrammarAndTone(rawText = "") {
  const weakMatches = [];
  ATS_WEAK_PHRASES.forEach((rule) => {
    const matches = rawText.match(rule.pattern) || [];
    matches.forEach((match) => {
      weakMatches.push({
        section: detectSectionForSnippet(rawText, match),
        issue: rule.issue,
        severity: rule.severity,
        snippet: match,
        suggestion: rule.suggestion,
        replacement: rule.replacement,
      });
    });
  });

  const repeatedWords = uniqueItems(
    words(rawText.toLowerCase())
      .filter((word) => word.length > 3)
      .filter((word, index, collection) => collection.indexOf(word) !== index)
  ).slice(0, 5);
  const score = clamp(100 - weakMatches.length * 9 - repeatedWords.length * 2, 20, 100);

  return {
    score,
    weakMatches,
    repeatedWords,
  };
}

function analyzeKeywords(rawText = "", profile = {}, jobDescription = "") {
  const mode = jobDescription.trim() ? "job-specific" : "generic";
  const expected = mode === "job-specific" ? extractImportantTerms(jobDescription, 30) : collectGenericExpectedKeywords(profile);
  const matched = findKeywordMentions(rawText, expected);
  const missing = expected.filter((term) => !matched.includes(term));
  const overused = matched.filter((term) => countTermOccurrences(rawText, term) >= 5).slice(0, 8);
  const evidenceBonus = clamp(
    matched.filter((term) => profile.experience.join(" ").toLowerCase().includes(term) || profile.projects.join(" ").toLowerCase().includes(term)).length * 4,
    0,
    20
  );
  const stuffingPenalty = overused.length * 4;
  const score = clamp(scoreRatio(matched.length, Math.max(expected.length, 1)) + evidenceBonus - stuffingPenalty, 10, 100);

  return {
    mode,
    score,
    matched: matched.slice(0, 12),
    missing: missing.slice(0, 12),
    overused,
  };
}

function buildATSMistakes(profile = {}, rawText = "", analyses = {}) {
  const mistakes = [...(analyses.grammar?.weakMatches || [])];

  if (!profile.email) {
    mistakes.push({
      section: "contact",
      issue: "Missing email address",
      severity: "high",
      snippet: "Email not found",
      suggestion: "Add a professional email in the header so ATS and recruiters can contact you.",
      replacement: "name@example.com",
    });
  }

  if (!profile.phone) {
    mistakes.push({
      section: "contact",
      issue: "Missing phone number",
      severity: "high",
      snippet: "Phone number not found",
      suggestion: "Add a working phone number in the resume header.",
      replacement: "+91 98765 43210",
    });
  }

  if (!profile.summary) {
    mistakes.push({
      section: "summary",
      issue: "Missing professional summary",
      severity: "medium",
      snippet: "Summary section missing",
      suggestion: "Add a 2-3 line summary focused on role fit, core tools, and strongest outcomes.",
      replacement: "Software engineer with hands-on experience building React and Node.js applications with strong project ownership.",
    });
  }

  if (!profile.skills.length) {
    mistakes.push({
      section: "skills",
      issue: "Skills section missing",
      severity: "high",
      snippet: "Skills section not found",
      suggestion: "Add a dedicated skills section with tools, languages, frameworks, and platforms.",
      replacement: "JavaScript, React, Node.js, Express, MongoDB, Git, REST APIs",
    });
  }

  const experienceBullets = [...profile.experience, ...profile.projects];
  experienceBullets.forEach((line) => {
    if (line && !/\b\d+(?:\.\d+)?%?\b/.test(line) && /(built|developed|implemented|managed|led|optimized|designed|created)/i.test(line)) {
      mistakes.push({
        section: profile.experience.includes(line) ? "experience" : "projects",
        issue: "Impact is not quantified",
        severity: "medium",
        snippet: line.slice(0, 120),
        suggestion: "Add scale, speed, savings, accuracy, or adoption numbers where possible.",
        replacement: `${line.slice(0, 70)} ... resulting in a measurable improvement such as reduced time by 20% or increased accuracy by 15%`,
      });
    }
  });

  if (analyses.formatting?.tableLike > 1) {
    mistakes.push({
      section: "formatting",
      issue: "Resume may use table-like formatting",
      severity: "medium",
      snippet: "Multiple table-like text fragments detected",
      suggestion: "Use simple single-column sections so ATS parsers can read the content consistently.",
      replacement: "Single-column headings with bullet points for each role or project",
    });
  }

  if (analyses.keywords?.missing?.length) {
    analyses.keywords.missing.slice(0, 4).forEach((term) => {
      mistakes.push({
        section: analyses.keywords.mode === "job-specific" ? "keyword-match" : "skills",
        issue: "Important keyword missing",
        severity: "medium",
        snippet: term,
        suggestion: "Add this keyword only if you truly have the skill or experience and can support it with evidence.",
        replacement: `Include ${term} in skills plus a supporting bullet in experience or projects`,
      });
    });
  }

  return mistakes.slice(0, 16);
}

function summarizeATSReport(mode, overallScore, mistakes, keywordAnalysis) {
  const scoreLabel = overallScore >= 85 ? "strong" : overallScore >= 70 ? "competitive" : overallScore >= 55 ? "mixed" : "weak";
  const keywordLine = mode === "job-specific"
    ? `Matched ${keywordAnalysis.matched.length} important job terms and missed ${keywordAnalysis.missing.length}.`
    : `Matched ${keywordAnalysis.matched.length} baseline ATS terms and missed ${keywordAnalysis.missing.length}.`;
  const mistakeLine = mistakes.length
    ? `${mistakes.filter((item) => item.severity === "high").length} high-priority issues need attention.`
    : "No major ATS mistakes were detected.";

  return `This resume is ${scoreLabel} for ${mode === "job-specific" ? "the target job" : "general ATS screening"}. ${keywordLine} ${mistakeLine}`;
}

function buildImprovementPriority(mistakes = []) {
  const severityOrder = { high: 3, medium: 2, low: 1 };
  return mistakes
    .slice()
    .sort((left, right) => (severityOrder[right.severity] || 0) - (severityOrder[left.severity] || 0))
    .map((item) => `${sentenceCase(item.section)}: ${item.issue}`)
    .filter((item, index, collection) => collection.indexOf(item) === index)
    .slice(0, 6);
}

function calculateATSOverallScore(categoryScores, mode) {
  const weights =
    mode === "job-specific"
      ? {
          formatting: 8,
          atsReadability: 7,
          sectionCompleteness: 12,
          keywordMatch: 30,
          experienceQuality: 18,
          achievementsImpact: 15,
          grammarClarity: 10,
        }
      : {
          formatting: 8,
          atsReadability: 7,
          sectionCompleteness: 15,
          keywordMatch: 25,
          experienceQuality: 20,
          achievementsImpact: 15,
          grammarClarity: 10,
        };

  const total = Object.entries(weights).reduce(
    (sum, [key, weight]) => sum + ((categoryScores[key] || 0) / 100) * weight,
    0
  );

  return Math.round(clamp(total, 0, 100));
}

function heuristicEvaluationForAnswer(question, answer, profile, answerMeta = {}) {
  const transcript = (answer || "").trim();
  const answerWords = words(transcript);
  const wordCount = answerWords.length;
  const durationSeconds = Number(answerMeta.durationSeconds || 0);
  const questionKeywords = answerKeywordSource(question.question, profile);
  const answerKeywords = keywordBag(transcript);
  const matchedKeywords = questionKeywords.filter((keyword) => answerKeywords.includes(keyword)).length;
  const reference = findBestReferenceForQuestion(question, profile);
  const referenceKeywords = reference
    ? uniqueItems([...(reference.keywords || []), ...extractImportantTerms(reference.answer || reference.question, 12)])
    : [];
  const referenceCoverage = buildReferenceCoverage(referenceKeywords, answerKeywords);
  const referenceMatches = referenceCoverage.matched.length;
  const sentenceCount = countSentences(transcript);
  const fillerWords = fillerCount(transcript);
  const hasExample = /(for example|for instance|when i|i worked on|i built|i led|i developed|i solved|i improved)/i.test(
    transcript
  );
  const hasNumbers = /\b\d+(?:\.\d+)?%?\b/.test(transcript);
  const resumeAlignment = matchedKeywords / Math.max(1, Math.min(questionKeywords.length, 8));
  const referenceAlignment = referenceCoverage.ratio;
  const relevance = clamp((resumeAlignment * 3.5) + (referenceAlignment * 6.5), 1, 10);
  const depth = clamp((wordCount / 22) + (hasExample ? 2 : 0) + (hasNumbers ? 1 : 0), 1, 10);
  const structure = clamp(sentenceCount >= 3 ? 8 : sentenceCount >= 2 ? 6 : 3, 1, 10);
  const clarity = clamp(10 - fillerWords * 0.8, 2, 10);
  const completeness = clamp((wordCount / 18) * 10, 1, 10);
  const contentScore = clamp((relevance * 0.48) + (depth * 0.2) + (structure * 0.14) + (completeness * 0.18), 0, 10);

  const transcriptContinuity = clamp(sentenceCount >= 3 ? 8 : sentenceCount >= 2 ? 6 : 4, 1, 10);
  const pacingProxy = durationSeconds > 0 ? clamp((wordCount / durationSeconds) * 2.8, 2, 10) : 6;
  const confidenceProxy = clamp((clarity * 0.5) + (transcriptContinuity * 0.3) + (pacingProxy * 0.2), 1, 10);
  const speakingScore = clamp((clarity * 0.35) + (confidenceProxy * 0.35) + (transcriptContinuity * 0.3), 0, 10);
  const overall = clamp((contentScore * 0.7) + (speakingScore * 0.3), 0, 10);
  const label = overall >= 8.5 ? "Excellent" : overall >= 7 ? "Strong" : overall >= 5.5 ? "Fair" : "Needs Work";

  const strengths = [];
  const weaknesses = [];

  if (hasExample) strengths.push("Used a concrete example");
  if (hasNumbers) strengths.push("Included measurable detail");
  if (matchedKeywords >= 2) strengths.push("Stayed relevant to the question");
  if (referenceCoverage.ratio >= 0.45) strengths.push("Covered key points expected for this topic");
  if (sentenceCount >= 3) strengths.push("Answer had clear structure");
  if (clarity >= 7.5) strengths.push("Speech transcript was fairly clear");

  if (wordCount < 20) weaknesses.push("Answer felt too brief");
  if (!hasExample) weaknesses.push("Could use a specific example");
  if (matchedKeywords < 2) weaknesses.push("Could connect more directly to the question");
  if (reference && referenceCoverage.ratio < 0.3) weaknesses.push("Missed important points from the expected answer");
  if (fillerWords >= 3) weaknesses.push("Too many filler words reduced confidence");
  if (sentenceCount < 2) weaknesses.push("Answer structure was thin");

  const improvement = !hasExample
    ? "Add one specific example with what you did, the result, and what you learned."
    : wordCount < 20
    ? "Expand the answer with more detail about your actions and outcome."
    : reference && referenceCoverage.ratio < 0.3
    ? `Cover the missing core points such as ${referenceCoverage.missing.slice(0, 3).join(", ")} and connect them to your own experience.`
    : matchedKeywords < 2
    ? "Tie the answer back to the exact skill, project, or situation asked in the question."
    : fillerWords >= 3
    ? "Slow down slightly and pause instead of using filler words."
    : "Keep the same structure and make the result or impact even more explicit.";

  return {
    questionId: question.id,
    question: question.question,
    type: question.type,
    focusArea: question.focusArea,
    transcript,
    durationSeconds,
    wordCount,
    contentScore: Number(contentScore.toFixed(1)),
    speakingScore: Number(speakingScore.toFixed(1)),
    score: Number(overall.toFixed(1)),
    ratingLabel: label,
    strengths: uniqueItems(strengths).slice(0, 3),
    weaknesses: uniqueItems(weaknesses).slice(0, 3),
    feedback:
      overall >= 7
        ? "This answer covered the important expected points and was delivered fairly clearly."
        : overall >= 5
        ? "The answer covered only part of the expected answer and needs stronger topic coverage or sharper delivery."
        : "The answer was far from the expected answer and needs stronger content, structure, and speaking confidence.",
    improvementSuggestion: improvement,
    referenceAnswer: reference?.answer || "",
    referenceCoverageRatio: Number((referenceCoverage.ratio * 100).toFixed(0)),
    missingReferencePoints: referenceCoverage.missing.slice(0, 5),
  };
}

async function evaluateWithAI(profile, interviewType, questions, answers) {
  const evaluationContext = questions.map((question) => {
    const reference = findBestReferenceForQuestion(question, profile);
    return {
      questionId: question.id,
      category: reference?.category || question.focusArea || "",
      referenceAnswer: reference?.answer || "",
      referenceKeywords: reference?.keywords || [],
      source: reference?.source || "",
    };
  });

  const messages = [
    {
      role: "system",
      content:
        "You are a strict interview evaluator. Return only valid JSON. Score each answer from 0 to 10. Be honest and practical. Use both answer quality and speaking-quality proxy from transcript style and duration.",
    },
    {
      role: "user",
      content: `Return JSON in this shape:
{
  "questionByQuestionAnalysis": [
    {
      "questionId": "q-1",
      "question": "",
      "type": "",
      "focusArea": "",
      "transcript": "",
      "durationSeconds": 0,
      "wordCount": 0,
      "contentScore": 0,
      "speakingScore": 0,
      "score": 0,
      "ratingLabel": "",
      "strengths": [],
      "weaknesses": [],
      "feedback": "",
      "improvementSuggestion": "",
      "referenceAnswer": "",
      "referenceCoverageRatio": 0,
      "missingReferencePoints": []
    }
  ],
  "overallStrengths": [],
  "overallWeaknesses": [],
  "recommendations": []
}

Interview type: ${interviewType}
Candidate profile: ${JSON.stringify(profile)}
Questions: ${JSON.stringify(questions)}
Answers: ${JSON.stringify(answers)}
Dataset evaluation references: ${JSON.stringify(evaluationContext)}`,
    },
  ];

  const content = await callOpenRouter(messages, { temperature: 0.2, maxTokens: 2500 });
  const json = extractFirstJsonBlock(content);
  if (!json) {
    throw new Error("No evaluation JSON returned");
  }

  const parsed = JSON.parse(json);
  if (!Array.isArray(parsed.questionByQuestionAnalysis)) {
    throw new Error("Invalid evaluation payload");
  }

  return parsed;
}

function summarizeRecommendations(analysis) {
  const shortAnswers = analysis.filter((item) => item.wordCount < 20).length;
  const weakSpeaking = analysis.filter((item) => item.speakingScore < 6).length;
  const weakExamples = analysis.filter((item) =>
    item.weaknesses.some((weakness) => /example/i.test(weakness))
  ).length;

  const recommendations = [];
  if (shortAnswers >= 3) {
    recommendations.push("Practice giving fuller answers with action, reasoning, and result.");
  }
  if (weakExamples >= 3) {
    recommendations.push("Prepare STAR-style examples from projects, teamwork, and challenges.");
  }
  if (weakSpeaking >= 3) {
    recommendations.push("Work on slower, more confident delivery with fewer filler words.");
  }
  recommendations.push("Review your resume projects so you can explain decisions, challenges, and outcomes clearly.");
  recommendations.push("Do another mock round and compare improvements question by question.");

  return uniqueItems(recommendations).slice(0, 5);
}

function aggregateEvaluation(profile, questions, answers, aiEvaluation) {
  const fallback = questions.map((question, index) =>
    heuristicEvaluationForAnswer(question, answers[index]?.transcript || "", profile, answers[index] || {})
  );

  const mergedAnalysis = Array.isArray(aiEvaluation?.questionByQuestionAnalysis) && aiEvaluation.questionByQuestionAnalysis.length
    ? questions.map((question, index) => {
        const provided = aiEvaluation.questionByQuestionAnalysis[index] || {};
        const base = fallback[index];
        return {
          ...base,
          ...provided,
          questionId: provided.questionId || question.id,
          question: provided.question || question.question,
          type: provided.type || question.type,
          focusArea: provided.focusArea || question.focusArea,
          transcript: provided.transcript || answers[index]?.transcript || "",
          durationSeconds:
            provided.durationSeconds !== undefined
              ? Number(provided.durationSeconds || 0)
              : Number(answers[index]?.durationSeconds || 0),
          wordCount:
            provided.wordCount !== undefined
              ? Number(provided.wordCount || 0)
              : words(answers[index]?.transcript || "").length,
          contentScore: Number((provided.contentScore ?? base.contentScore).toFixed(1)),
          speakingScore: Number((provided.speakingScore ?? base.speakingScore).toFixed(1)),
          score: Number((provided.score ?? base.score).toFixed(1)),
          ratingLabel: provided.ratingLabel || base.ratingLabel,
          strengths: Array.isArray(provided.strengths) && provided.strengths.length ? provided.strengths : base.strengths,
          weaknesses:
            Array.isArray(provided.weaknesses) && provided.weaknesses.length ? provided.weaknesses : base.weaknesses,
          feedback: provided.feedback || base.feedback,
          improvementSuggestion: provided.improvementSuggestion || base.improvementSuggestion,
          referenceAnswer: provided.referenceAnswer || base.referenceAnswer || "",
          referenceCoverageRatio:
            provided.referenceCoverageRatio !== undefined
              ? Number(provided.referenceCoverageRatio || 0)
              : Number(base.referenceCoverageRatio || 0),
          missingReferencePoints:
            Array.isArray(provided.missingReferencePoints) && provided.missingReferencePoints.length
              ? provided.missingReferencePoints
              : base.missingReferencePoints || [],
        };
      })
    : fallback;

  const overallAverage = mergedAnalysis.reduce((sum, item) => sum + item.score, 0) / Math.max(mergedAnalysis.length, 1);
  const rating = Number(overallAverage.toFixed(1));
  const overallScore = Math.round(rating * 10);
  const strengths = uniqueItems(
    (Array.isArray(aiEvaluation?.overallStrengths) ? aiEvaluation.overallStrengths : []).concat(
      mergedAnalysis.flatMap((item) => item.strengths)
    )
  ).slice(0, 6);
  const weaknesses = uniqueItems(
    (Array.isArray(aiEvaluation?.overallWeaknesses) ? aiEvaluation.overallWeaknesses : []).concat(
      mergedAnalysis.flatMap((item) => item.weaknesses)
    )
  ).slice(0, 6);
  const recommendations = uniqueItems(
    (Array.isArray(aiEvaluation?.recommendations) ? aiEvaluation.recommendations : []).concat(
      summarizeRecommendations(mergedAnalysis)
    )
  ).slice(0, 5);

  const strongAnswers = mergedAnalysis.filter((item) => item.score >= 7.5).length;
  const weakAnswers = mergedAnalysis.filter((item) => item.score < 5.5).length;
  const avgContent = mergedAnalysis.reduce((sum, item) => sum + item.contentScore, 0) / Math.max(mergedAnalysis.length, 1);
  const avgSpeaking = mergedAnalysis.reduce((sum, item) => sum + item.speakingScore, 0) / Math.max(mergedAnalysis.length, 1);

  return {
    overallScore,
    rating,
    strengths,
    weaknesses,
    recommendations,
    detailedFeedback: `You completed ${mergedAnalysis.length} questions. ${strongAnswers} answers were strong, ${weakAnswers} need more work. Content quality averaged ${avgContent.toFixed(
      1
    )}/10 and speaking quality averaged ${avgSpeaking.toFixed(1)}/10.`,
    questionByQuestionAnalysis: mergedAnalysis,
  };
}

async function extractResumeText(file) {
  const extension = getExtension(file.originalname);
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error("Unsupported file format. Please upload PDF, DOCX, or TXT.");
  }

  if (!file.buffer || !file.buffer.length) {
    throw new Error("Uploaded file is empty.");
  }

  if (extension === ".txt") {
    return normalizeWhitespace(file.buffer.toString("utf8"));
  }

  if (extension === ".docx") {
    const result = await mammoth.extractRawText({ buffer: file.buffer });
    return normalizeWhitespace(result.value);
  }

  const parser = new PDFParse({ data: file.buffer });

  try {
    const result = await parser.getText();
    return normalizeWhitespace(result.text);
  } finally {
    await parser.destroy();
  }
}

async function buildResumeResponse(file) {
  const rawText = await extractResumeText(file);
  if (!rawText || rawText.length < 40) {
    throw new Error("Could not extract enough text from this resume.");
  }

  const baseProfile = extractCandidateProfileFromText(rawText, file.originalname);
  const candidateProfile = await maybeEnhanceProfileWithAI(rawText, baseProfile);

  return {
    fileName: file.originalname,
    rawText,
    candidateProfile,
  };
}

async function buildQuestionResponse(candidateProfile, rawText, interviewType) {
  await ensureQuestionBankLoaded();
  const fallback = generateFallbackQuestions(candidateProfile, rawText, interviewType);

  try {
    const aiQuestions = await generateQuestionsWithAI(candidateProfile, rawText, interviewType);
    if (aiQuestions.length === 10) {
      return { questions: aiQuestions };
    }
  } catch (error) {
    return { questions: fallback };
  }

  return { questions: fallback };
}

async function buildEvaluationResponse(candidateProfile, interviewType, questions, answers) {
  await ensureQuestionBankLoaded();
  let aiEvaluation = null;

  try {
    aiEvaluation = await evaluateWithAI(candidateProfile, interviewType, questions, answers);
  } catch (error) {
    aiEvaluation = null;
  }

  return aggregateEvaluation(candidateProfile, questions, answers, aiEvaluation);
}

async function buildATSResponse(candidateProfile, rawText, jobDescription = "", fileName = "") {
  if (!rawText || rawText.trim().length < 40) {
    throw new Error("Resume text is required for ATS analysis.");
  }

  const profile = profileSnapshot({
    ...candidateProfile,
    fileName: fileName || candidateProfile?.fileName || "",
  });
  const mode = jobDescription.trim() ? "job-specific" : "generic";
  const formatting = analyzeFormatting(rawText);
  const sections = analyzeSections(profile);
  const experience = analyzeExperienceQuality(profile);
  const achievements = analyzeAchievementsImpact(profile);
  const grammar = analyzeGrammarAndTone(rawText);
  const keywords = analyzeKeywords(rawText, profile, jobDescription);

  const categoryScores = {
    formatting: roundNumber(formatting.formattingScore, 1),
    sectionCompleteness: roundNumber(sections.sectionCompletenessScore, 1),
    keywordMatch: roundNumber(keywords.score, 1),
    experienceQuality: roundNumber(experience.score, 1),
    achievementsImpact: roundNumber(achievements.score, 1),
    grammarClarity: roundNumber(grammar.score, 1),
    atsReadability: roundNumber(formatting.readabilityScore, 1),
  };

  const mistakes = buildATSMistakes(profile, rawText, {
    formatting,
    keywords,
    grammar,
  });
  const overallScore = calculateATSOverallScore(categoryScores, mode);

  return {
    overallScore,
    mode,
    fileName: profile.fileName,
    categoryScores,
    summary: summarizeATSReport(mode, overallScore, mistakes, keywords),
    strengths: uniqueItems(
      [
        profile.skills.length ? "Skills section is present and machine-readable." : "",
        profile.education.length ? "Education details are available for ATS parsing." : "",
        experience.quantifiedHits ? "Resume includes quantified evidence in experience or projects." : "",
        keywords.matched.length >= 5
          ? mode === "job-specific"
            ? "Resume aligns with several important job-description terms."
            : "Resume covers several baseline ATS keywords."
          : "",
        formatting.tableLike === 0 ? "Layout appears mostly ATS-friendly and simple." : "",
      ].filter(Boolean)
    ).slice(0, 6),
    mistakes,
    keywordAnalysis: {
      matched: keywords.matched,
      missing: keywords.missing,
      overused: keywords.overused,
    },
    sectionAnalysis: sections.sectionAnalysis,
    improvementPriority: buildImprovementPriority(mistakes),
  };
}

module.exports = {
  buildATSResponse,
  buildResumeResponse,
  buildQuestionResponse,
  buildEvaluationResponse,
  profileSnapshot,
};
