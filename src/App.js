import "./utils/storage";
import "./App.css";
import React, { useEffect, useRef, useState } from "react";
import {
  Award,
  BarChart3,
  BookOpen,
  Camera,
  FileText,
  Home,
  LogOut,
  Mail,
  Mic,
  Moon,
  Phone,
  Save,
  Settings,
  Sun,
  TrendingUp,
  User,
} from "lucide-react";
import { LoginPage, SignupPage } from "./components/AuthPages";
import { ATSChecker, InterviewCourses } from "./components/DashboardAndExtras";
import { HomePage } from "./components/HomePage";
import { InterviewPractice } from "./components/InterviewPractice";
import { ProgressPage, RankPage } from "./components/RankAndProgressPages";
import { BrandMark, initials } from "./components/SharedUI";
import {
  buildDailyChallenge,
  getRankProgress,
  getNextRank,
  normalizeSessionHistory,
  normalizeUserData,
} from "./utils/gamification";
const THEME_STORAGE_KEY = "theme_preference";

const NavButton = ({ label, icon, active, onClick }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
      active
        ? "bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900"
        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
    }`}
  >
    {icon}
    {label}
  </button>
);

const quickActionCards = [
  { key: "rank", label: "Rank", icon: <Award className="h-6 w-6" />, accent: "from-amber-300 to-orange-500", page: "rank", description: "See badge tier" },
  { key: "progress", label: "Progress", icon: <TrendingUp className="h-6 w-6" />, accent: "from-emerald-300 to-green-500", page: "progress", description: "Review scores" },
  { key: "profile", label: "Profile", icon: <User className="h-6 w-6" />, accent: "from-sky-300 to-blue-600", page: "profile", description: "Account summary" },
  { key: "courses", label: "Courses", icon: <BookOpen className="h-6 w-6" />, accent: "from-violet-300 to-indigo-600", page: "courses", description: "Prep tracks" },
];

const menuItems = [
  { key: "progress", label: "Open Progress", icon: <BarChart3 className="h-5 w-5" />, page: "progress" },
  { key: "rank", label: "Open Rank Center", icon: <Award className="h-5 w-5" />, page: "rank" },
  { key: "ats", label: "ATS Checker", icon: <FileText className="h-5 w-5" />, page: "ats" },
  { key: "settings", label: "Profile Settings", icon: <Settings className="h-5 w-5" />, page: "profile" },
];

const QuickActionCard = ({ label, icon, accent, description, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="group rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:hover:border-white/15 dark:hover:bg-white/[0.1]"
  >
    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg shadow-black/20`}>
      {icon}
    </div>
    <div className="mt-5 text-lg font-semibold text-slate-900 transition group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">{label}</div>
    <div className="mt-1 text-sm text-slate-500 transition group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300">{description}</div>
  </button>
);

const UserMenuItem = ({ icon, label, onClick, danger = false }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left text-base font-medium transition ${
      danger
        ? "text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/10 dark:hover:text-red-200"
        : "text-slate-700 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/8 dark:hover:text-white"
    }`}
  >
    <span className="text-slate-400 dark:text-slate-400">{icon}</span>
    <span>{label}</span>
  </button>
);

const getSystemTheme = () => {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light";
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

const applyTheme = (nextTheme) => {
  document.documentElement.classList.toggle("dark", nextTheme === "dark");
};

const createProfileFormState = (currentUser, userData) => ({
  firstName: currentUser?.firstName || "",
  lastName: currentUser?.lastName || "",
  email: currentUser?.email || "",
  phone: userData?.profile?.phone || userData?.latestCandidateProfile?.phone || "",
  skillsText: (userData?.profile?.skills || userData?.latestCandidateProfile?.skills || []).join(", "),
  profilePhoto: userData?.profile?.profilePhoto || "",
});

const UserProfilePage = ({ currentUser, userData, gamification, sessionHistory, onSaveProfile }) => {
  const [formData, setFormData] = useState(() => createProfileFormState(currentUser, userData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setFormData(createProfileFormState(currentUser, userData));
  }, [currentUser, userData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setFormData((current) => ({
        ...current,
        profilePhoto: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      await onSaveProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        profilePhoto: formData.profilePhoto,
        skills: formData.skillsText,
      });
      setSuccess("Profile saved successfully.");
    } catch (saveError) {
      setError(saveError.message || "Unable to save profile.");
    } finally {
      setSaving(false);
    }
  };

  const normalizedSkills = formData.skillsText
    .split(",")
    .map((skill) => skill.trim())
    .filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] bg-white p-8 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <p className="text-sm uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400">User Profile</p>
        <h2 className="mt-2 text-3xl font-black text-slate-900 dark:text-slate-100">{`${currentUser?.firstName || "User"} ${currentUser?.lastName || ""}`.trim()}</h2>
        <p className="mt-3 text-slate-600 dark:text-slate-300">
          Manage your PERFEXA profile, personal information, profile picture, and skills in one place.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.85fr,1.15fr]">
        <div className="space-y-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Profile Picture</h3>
            <div className="mt-5 flex flex-col items-center gap-4 text-center">
              {formData.profilePhoto ? (
                <img src={formData.profilePhoto} alt="Profile preview" className="h-40 w-32 rounded-[1.5rem] object-cover ring-1 ring-slate-200 dark:ring-slate-700" />
              ) : (
                <div className="flex h-40 w-32 items-center justify-center rounded-[1.5rem] bg-slate-100 text-3xl font-black text-slate-700 ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:ring-slate-700">
                  {initials(`${formData.firstName} ${formData.lastName}`) || "U"}
                </div>
              )}
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200">
                <Camera className="h-4 w-4" />
                Upload passport-size photo
                <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
              </label>
              <p className="text-sm text-slate-500 dark:text-slate-400">A local preview is stored only in this browser profile.</p>
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Current Snapshot</h3>
            <div className="mt-5 grid gap-4">
              <div className="rounded-2xl bg-blue-100 px-4 py-3 text-center text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">
                <div className="text-xs font-semibold uppercase tracking-[0.15em]">Current Rank</div>
                <div className="mt-1 text-lg font-black">{gamification.currentRank}</div>
              </div>
              <div className="rounded-2xl bg-emerald-100 px-4 py-3 text-center text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <div className="text-xs font-semibold uppercase tracking-[0.15em]">Total XP</div>
                <div className="mt-1 text-lg font-black">{gamification.totalXp}</div>
              </div>
              <div className="rounded-2xl bg-slate-100 px-4 py-3 text-center text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <div className="text-xs font-semibold uppercase tracking-[0.15em]">Interviews</div>
                <div className="mt-1 text-lg font-black">{sessionHistory.length}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Personal Information</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Update your personal details and preferred skill tags.</p>
            </div>
            <button type="submit" disabled={saving} className="primary-button">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>

          {error ? <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{error}</div> : null}
          {success ? <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">{success}</div> : null}

          <div className="mt-6 grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">First Name</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  className="auth-input auth-input--with-leading-icon"
                  placeholder="First name"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Last Name</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  className="auth-input auth-input--with-leading-icon"
                  placeholder="Last name"
                />
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Email ID</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="auth-input auth-input--with-leading-icon"
                  placeholder="you@example.com"
                />
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Mobile Number</span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Phone className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                </div>
                <input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="auth-input auth-input--with-leading-icon"
                  placeholder="+91 9876543210"
                />
              </div>
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Skills</span>
              <textarea
                name="skillsText"
                value={formData.skillsText}
                onChange={handleChange}
                className="auth-input min-h-[140px]"
                placeholder="React, JavaScript, Node.js, Communication"
              />
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Separate each skill with a comma.</p>
            </label>

            <div className="md:col-span-2">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-200">Skill Preview</span>
              <div className="flex min-h-[3.5rem] flex-wrap gap-2 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                {normalizedSkills.length ? (
                  normalizedSkills.map((skill) => (
                    <span key={skill} className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900">
                      {skill}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-500 dark:text-slate-400">No skills added yet.</span>
                )}
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="submit" disabled={saving} className="primary-button">
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const AIInterviewSystem = () => {
  const [theme, setTheme] = useState("light");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [authPage, setAuthPage] = useState("login");
  const [currentPage, setCurrentPage] = useState("home");
  const [userData, setUserData] = useState(null);
  const [sessionHistory, setSessionHistory] = useState([]);
  const [interviewLaunchContext, setInterviewLaunchContext] = useState(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const boot = async () => {
      let nextTheme = getSystemTheme();

      try {
        const storedTheme = await window.storage.get(THEME_STORAGE_KEY);
        nextTheme = storedTheme.value === "dark" ? "dark" : "light";
      } catch (error) {
        // No saved preference yet.
      }

      setTheme(nextTheme);
      applyTheme(nextTheme);

      try {
        const result = await window.storage.get("current_user");
        const user = JSON.parse(result.value);
        setCurrentUser(user);
        setIsAuthenticated(true);
        await loadUserState(user.email);
      } catch (error) {
        setIsAuthenticated(false);
      }
    };

    boot();
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mediaQuery) {
      return undefined;
    }

    const handleThemeChange = async (event) => {
      try {
        await window.storage.get(THEME_STORAGE_KEY);
        return;
      } catch (error) {
        const systemTheme = event.matches ? "dark" : "light";
        setTheme(systemTheme);
        applyTheme(systemTheme);
      }
    };

    mediaQuery.addEventListener?.("change", handleThemeChange);

    return () => mediaQuery.removeEventListener?.("change", handleThemeChange);
  }, []);

  useEffect(() => {
    if (!isUserMenuOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (!userMenuRef.current?.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isUserMenuOpen]);

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    await window.storage.set(THEME_STORAGE_KEY, nextTheme);
  };

  const loadUserState = async (email) => {
    try {
      const storedData = await window.storage.get(`user_data_${email}`);
      setUserData(normalizeUserData(JSON.parse(storedData.value)));
    } catch (error) {
      setUserData(normalizeUserData({}));
    }

    try {
      const storedHistory = await window.storage.get(`session_history_${email}`);
      setSessionHistory(normalizeSessionHistory(JSON.parse(storedHistory.value)));
    } catch (error) {
      setSessionHistory([]);
    }
  };

  const saveUserData = async (nextData) => {
    if (!currentUser) return;

    const merged = normalizeUserData({
      ...(userData || {}),
      ...nextData,
    });

    await window.storage.set(`user_data_${currentUser.email}`, JSON.stringify(merged));
    setUserData(merged);
    return merged;
  };

  const addSessionToHistory = async (session) => {
    if (!currentUser) return;

    const nextHistory = normalizeSessionHistory([...sessionHistory, session]);
    await window.storage.set(`session_history_${currentUser.email}`, JSON.stringify(nextHistory));
    setSessionHistory(nextHistory);
    return nextHistory;
  };

  const saveInterviewProgress = async ({ session, userDataPatch }) => {
    if (!currentUser) return null;

    const mergedUserData = normalizeUserData({
      ...(userData || {}),
      ...(userDataPatch || {}),
    });
    const nextHistory = normalizeSessionHistory([...sessionHistory, session]);

    await window.storage.set(`user_data_${currentUser.email}`, JSON.stringify(mergedUserData));
    await window.storage.set(`session_history_${currentUser.email}`, JSON.stringify(nextHistory));

    setUserData(mergedUserData);
    setSessionHistory(nextHistory);

    return { userData: mergedUserData, sessionHistory: nextHistory };
  };

  const handleLoginSuccess = async (user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    await window.storage.set("current_user", JSON.stringify(user));
    await loadUserState(user.email);
  };

  const handleSaveProfile = async ({ firstName, lastName, email, phone, profilePhoto, skills }) => {
    if (!currentUser) {
      throw new Error("No active user found.");
    }

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const normalizedSkills = skills
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    if (!trimmedFirstName || !trimmedLastName || !trimmedEmail) {
      throw new Error("First name, last name, and email are required.");
    }

    const oldEmail = currentUser.email;
    const nextUser = {
      ...currentUser,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      email: trimmedEmail,
    };

    if (trimmedEmail !== oldEmail) {
      try {
        const existing = await window.storage.get(`user_${trimmedEmail}`);
        if (existing?.value) {
          throw new Error("An account with this email already exists.");
        }
      } catch (lookupError) {
        if (lookupError.message === "An account with this email already exists.") {
          throw lookupError;
        }
      }
    }

    const nextUserData = normalizeUserData({
      ...(userData || {}),
      profile: {
        ...(userData?.profile || {}),
        phone: trimmedPhone,
        profilePhoto,
        skills: normalizedSkills,
      },
    });

    await window.storage.set(`user_${trimmedEmail}`, JSON.stringify(nextUser));
    await window.storage.set("current_user", JSON.stringify(nextUser));
    await window.storage.set(`user_data_${trimmedEmail}`, JSON.stringify(nextUserData));

    if (trimmedEmail !== oldEmail) {
      await window.storage.set(`session_history_${trimmedEmail}`, JSON.stringify(sessionHistory));
      await window.storage.delete(`user_${oldEmail}`);
      await window.storage.delete(`user_data_${oldEmail}`);
      await window.storage.delete(`session_history_${oldEmail}`);
    }

    setCurrentUser(nextUser);
    setUserData(nextUserData);
  };

  const handleLogout = async () => {
    await window.storage.delete("current_user");
    setCurrentUser(null);
    setUserData(null);
    setSessionHistory([]);
    setInterviewLaunchContext(null);
    setIsAuthenticated(false);
    setCurrentPage("home");
    setAuthPage("login");
    setIsUserMenuOpen(false);
  };

  const gamification = normalizeUserData(userData || {}).gamification;
  const dailyChallenge = buildDailyChallenge(new Date());
  const nextRank = getNextRank(gamification.totalXp);
  const rankProgress = getRankProgress(gamification.totalXp);
  const profilePhoto = userData?.profile?.profilePhoto || "";

  const startDailyChallenge = () => {
    setInterviewLaunchContext({
      source: "daily_challenge",
      dailyChallenge,
      interviewType: dailyChallenge.interviewType,
      sessionMode: dailyChallenge.sessionMode,
    });
    setCurrentPage("interview");
  };

  const clearInterviewLaunchContext = () => {
    setInterviewLaunchContext(null);
  };

  const openMenuPage = (pageName) => {
    setCurrentPage(pageName);
    setIsUserMenuOpen(false);
  };

  if (!isAuthenticated) {
    return authPage === "login" ? (
      <LoginPage setAuthPage={setAuthPage} onLoginSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleTheme} />
    ) : (
      <SignupPage setAuthPage={setAuthPage} onSignupSuccess={handleLoginSuccess} theme={theme} onToggleTheme={toggleTheme} />
    );
  }

  let page = (
    <HomePage
      currentUser={currentUser}
      setCurrentPage={setCurrentPage}
      sessionHistory={sessionHistory}
      gamification={gamification}
      dailyChallenge={dailyChallenge}
      onStartDailyChallenge={startDailyChallenge}
      nextRank={nextRank}
    />
  );

  if (currentPage === "interview") {
    page = (
      <InterviewPractice
        currentUser={currentUser}
        userData={userData}
        saveUserData={saveUserData}
        addSessionToHistory={addSessionToHistory}
        saveInterviewProgress={saveInterviewProgress}
        launchContext={interviewLaunchContext}
        onLaunchContextConsumed={clearInterviewLaunchContext}
      />
    );
  } else if (currentPage === "ats") {
    page = <ATSChecker userData={userData} saveUserData={saveUserData} />;
  } else if (currentPage === "progress") {
    page = (
      <ProgressPage
        sessionHistory={sessionHistory}
        gamification={gamification}
        dailyChallenge={dailyChallenge}
        onStartDailyChallenge={startDailyChallenge}
        nextRank={nextRank}
      />
    );
  } else if (currentPage === "rank") {
    page = <RankPage gamification={gamification} dailyChallenge={dailyChallenge} onStartDailyChallenge={startDailyChallenge} />;
  } else if (currentPage === "courses") {
    page = <InterviewCourses />;
  } else if (currentPage === "profile") {
    page = (
      <UserProfilePage
        currentUser={currentUser}
        userData={userData}
        gamification={gamification}
        sessionHistory={sessionHistory}
        onSaveProfile={handleSaveProfile}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <nav className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur transition-colors dark:border-slate-800 dark:bg-slate-950/85">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <button className="flex items-center gap-3" onClick={() => setCurrentPage("home")}>
            <BrandMark compact invert={theme === "dark"} />
          </button>

          <div className="hidden items-center gap-2 md:flex">
            <NavButton label="Home" active={currentPage === "home"} icon={<Home className="h-4 w-4" />} onClick={() => setCurrentPage("home")} />
            <NavButton label="Interview" active={currentPage === "interview"} icon={<Mic className="h-4 w-4" />} onClick={() => setCurrentPage("interview")} />
            <NavButton label="ATS" active={currentPage === "ats"} icon={<FileText className="h-4 w-4" />} onClick={() => setCurrentPage("ats")} />
            <NavButton label="Progress" active={currentPage === "progress"} icon={<BarChart3 className="h-4 w-4" />} onClick={() => setCurrentPage("progress")} />
            <NavButton label="Courses" active={currentPage === "courses"} icon={<BookOpen className="h-4 w-4" />} onClick={() => setCurrentPage("courses")} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span className="hidden sm:inline">{theme === "dark" ? "Light" : "Dark"}</span>
            </button>
            <div className="relative" ref={userMenuRef}>
              <button
                type="button"
                onClick={() => setIsUserMenuOpen((current) => !current)}
                className={`inline-flex items-center gap-3 rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
                  isUserMenuOpen
                    ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
                aria-expanded={isUserMenuOpen}
                aria-haspopup="menu"
              >
                {profilePhoto ? (
                  <img src={profilePhoto} alt="Profile" className="h-9 w-9 rounded-xl object-cover ring-1 ring-black/5 dark:ring-white/10" />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 via-orange-400 to-pink-500 text-sm font-black text-slate-950">
                    {initials(`${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`) || "U"}
                  </span>
                )}
                <span className="hidden text-left md:block">
                  <span className="block">{`${currentUser?.firstName || "User"} ${currentUser?.lastName || ""}`.trim()}</span>
                  <span className={`block text-xs font-medium ${isUserMenuOpen ? "text-white/70 dark:text-slate-500" : "text-slate-500 dark:text-slate-400"}`}>
                    Open menu
                  </span>
                </span>
              </button>

              {isUserMenuOpen ? (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-40 mb-6 w-[22rem] max-h-[calc(100vh-8.5rem)] max-w-[calc(100vw-2rem)] overflow-y-auto overflow-x-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-900 shadow-[0_30px_80px_rgba(15,23,42,0.18)] dark:border-white/10 dark:bg-[#222222] dark:text-white dark:shadow-[0_30px_80px_rgba(15,23,42,0.5)] sm:w-[24rem]">
                  <div className="flex items-start gap-4">
                    {profilePhoto ? (
                      <img src={profilePhoto} alt="Profile" className="h-16 w-16 shrink-0 rounded-full object-cover ring-2 ring-black/5 dark:ring-white/10" />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 via-orange-400 to-pink-500 text-xl font-black text-slate-950">
                        {initials(`${currentUser?.firstName || ""} ${currentUser?.lastName || ""}`) || "U"}
                      </div>
                    )}
                    <div>
                      <h3 className="text-[1.7rem] font-black leading-none text-slate-900 dark:text-white">{`${currentUser?.firstName || "User"} ${currentUser?.lastName || ""}`.trim()}</h3>
                    </div>
                  </div>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    {quickActionCards.map((item) => (
                      <QuickActionCard
                        key={item.key}
                        label={item.label}
                        icon={item.icon}
                        accent={item.accent}
                        description={item.description}
                        onClick={() => openMenuPage(item.page)}
                      />
                    ))}
                  </div>

                  <div className="mt-5 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
                      <span>Current rank</span>
                      <span>{gamification.currentRank}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                        style={{ width: `${Math.max(10, rankProgress.progressPercent)}%` }}
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      <span>{gamification.totalXp} XP</span>
                      <span>{sessionHistory.length} interviews</span>
                    </div>
                  </div>

                  <div className="mt-5 space-y-1 border-t border-slate-200 pt-4 dark:border-white/10">
                    {menuItems.map((item) => (
                      <UserMenuItem key={item.key} icon={item.icon} label={item.label} onClick={() => openMenuPage(item.page)} />
                    ))}
                    <div className="pt-2">
                      <UserMenuItem icon={<LogOut className="h-5 w-5" />} label="Logout" onClick={handleLogout} danger />
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{page}</main>
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, color: 'white', backgroundColor: '#990000', minHeight: '100vh', fontFamily: 'monospace' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Application Crashed!</h2>
          <p style={{ marginBottom: '2rem' }}>Please take a screenshot of this error and send it to the AI:</p>
          <pre style={{ whiteSpace: 'pre-wrap', backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 8 }}>
            {this.state.error && this.state.error.toString()}
            {'\n\n'}
            {this.state.error && this.state.error.stack}
          </pre>
          <button 
            onClick={() => window.location.reload()} 
            style={{ padding: '10px 20px', marginTop: 20, color: 'black', backgroundColor: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function AppWithErrorBoundary(props) {
  return (
    <ErrorBoundary>
      <AIInterviewSystem {...props} />
    </ErrorBoundary>
  );
}
