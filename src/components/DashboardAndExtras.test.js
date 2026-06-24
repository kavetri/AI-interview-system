import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ATSChecker } from "./DashboardAndExtras";
import { analyzeATSResume, uploadResumeFile } from "../utils/interviewApi";

jest.mock("../utils/interviewApi", () => ({
  analyzeATSResume: jest.fn(),
  uploadResumeFile: jest.fn(),
}));

describe("ATSChecker", () => {
  test("shows empty state when no resume has been uploaded", () => {
    render(<ATSChecker userData={{}} saveUserData={jest.fn()} />);

    expect(screen.getByRole("heading", { name: /resume upload/i })).toBeInTheDocument();
    expect(screen.getByText(/no resume uploaded in ats yet/i)).toBeInTheDocument();
    expect(screen.getByText(/upload resume/i)).toBeInTheDocument();
  });

  test("uploads a resume directly from the ATS page", async () => {
    uploadResumeFile.mockResolvedValue({
      fileName: "resume.pdf",
      rawText: "John Doe\njohn@example.com\nBuilt a React dashboard.",
      candidateProfile: {
        fullName: "John Doe",
        email: "john@example.com",
        phone: "9876543210",
        location: "Bangalore",
        summary: "Frontend developer building React apps",
        education: ["B.Tech in CSE"],
        experience: ["Built internal tools"],
        skills: ["React", "Node.js"],
        projects: ["Dashboard project"],
        certifications: [],
        achievements: [],
      },
    });

    const saveUserData = jest.fn().mockResolvedValue(undefined);

    render(<ATSChecker userData={{}} saveUserData={saveUserData} />);

    const input = document.querySelector('input[type="file"]');
    const file = new File(["resume"], "resume.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(uploadResumeFile).toHaveBeenCalledWith(file));
    expect(await screen.findByText(/current file: resume\.pdf/i)).toBeInTheDocument();
    expect(saveUserData).toHaveBeenCalled();
  });

  test("runs ATS analysis and renders the report", async () => {
    analyzeATSResume.mockResolvedValue({
      overallScore: 78,
      mode: "generic",
      categoryScores: {
        formatting: 80,
        sectionCompleteness: 90,
        keywordMatch: 70,
        experienceQuality: 75,
        achievementsImpact: 68,
        grammarClarity: 82,
        atsReadability: 77,
      },
      summary: "This resume is competitive for general ATS screening.",
      strengths: ["Skills section is present and machine-readable."],
      mistakes: [
        {
          section: "experience",
          issue: "Weak ownership wording",
          severity: "high",
          snippet: "Responsible for managing team",
          suggestion: "Use a direct action verb and outcome.",
          replacement: "Led a 4-member team to deliver the module before deadline",
        },
      ],
      keywordAnalysis: {
        matched: ["react", "node"],
        missing: ["typescript"],
        overused: [],
      },
      sectionAnalysis: {
        contact: { present: true, notes: [] },
        summary: { present: true, notes: [] },
        skills: { present: true, notes: [] },
        experience: { present: true, notes: [] },
        projects: { present: true, notes: [] },
        education: { present: true, notes: [] },
        certifications: { present: false, notes: ["Certifications not found."] },
      },
      improvementPriority: ["Experience: Weak ownership wording"],
    });

    const saveUserData = jest.fn().mockResolvedValue(undefined);

    render(
      <ATSChecker
        saveUserData={saveUserData}
        userData={{
          latestResumeFileName: "resume.pdf",
          latestResumeText: "John Doe\njohn@example.com\nBuilt a React dashboard.",
          latestCandidateProfile: {
            fullName: "John Doe",
            email: "john@example.com",
            phone: "9876543210",
            location: "Bangalore",
            summary: "Frontend developer building React apps",
            education: ["B.Tech in CSE"],
            experience: ["Built internal tools"],
            skills: ["React", "Node.js"],
            projects: ["Dashboard project"],
            certifications: [],
            achievements: [],
          },
        }}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /analyze resume/i }));

    await waitFor(() => expect(analyzeATSResume).toHaveBeenCalled());
    expect(await screen.findByText(/this resume is competitive for general ats screening/i)).toBeInTheDocument();
    expect(screen.getByText(/responsible for managing team/i)).toBeInTheDocument();
    expect(saveUserData).toHaveBeenCalled();
  });
});
