import React, { useState } from "react";
import {
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
  UserCircle2,
  Zap,
} from "lucide-react";
import { BRAND_TAGLINE, BrandMark, ErrorBanner, Field } from "./SharedUI";

const authHighlights = [
  { icon: <Sparkles className="h-4 w-4" />, title: "Personalized prep", body: "Practice sessions adapt to your resume and role targets." },
  { icon: <ShieldCheck className="h-4 w-4" />, title: "Private by default", body: "Your interview data stays local to your workspace." },
  { icon: <Zap className="h-4 w-4" />, title: "Faster feedback", body: "Track improvement with ATS checks and interview scoring." },
];

const AuthShell = ({ title, subtitle, children, theme, onToggleTheme, eyebrow, caption }) => (
  <div className="auth-screen relative min-h-screen overflow-hidden px-4 py-8 text-slate-900 dark:text-white sm:px-6 lg:px-8">
    <div className="auth-screen__orb auth-screen__orb--one" />
    <div className="auth-screen__orb auth-screen__orb--two" />
    <div className="auth-screen__grid" />

    <button
      type="button"
      onClick={onToggleTheme}
      className="absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-lg shadow-slate-900/5 backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white/85 dark:border-white/10 dark:bg-slate-900/60 dark:text-slate-100 dark:shadow-black/20 dark:hover:bg-slate-900/80"
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>

    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center justify-center">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr,0.95fr]">
        <section className="hidden rounded-[2rem] border border-white/50 bg-white/55 p-8 shadow-[0_30px_80px_rgba(15,23,42,0.14)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/45 lg:flex lg:flex-col lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/80 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <Sparkles className="h-4 w-4" />
              {BRAND_TAGLINE}
            </div>
            <h2 className="mt-6 max-w-lg text-5xl font-black leading-[1.05] text-slate-900 dark:text-white">
              Build sharper interview answers with a cleaner daily workflow.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-300">
              From ATS review to mock interviews, everything is organized in one focused workspace designed for confident preparation.
            </p>
          </div>

          <div className="mt-10 grid gap-4">
            {authHighlights.map((item) => (
              <div
                key={item.title}
                className="rounded-[1.75rem] border border-white/60 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <div className="rounded-[1.75rem] bg-slate-900 p-5 text-white shadow-xl dark:bg-white dark:text-slate-900">
              <div className="text-3xl font-black">24/7</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 dark:text-slate-500">Practice access</div>
            </div>
            <div className="rounded-[1.75rem] bg-white/80 p-5 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/5 dark:ring-white/10">
              <div className="text-3xl font-black text-slate-900 dark:text-white">ATS</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Resume analysis</div>
            </div>
            <div className="rounded-[1.75rem] bg-white/80 p-5 shadow-sm ring-1 ring-slate-200/80 dark:bg-white/5 dark:ring-white/10">
              <div className="text-3xl font-black text-slate-900 dark:text-white">1 Hub</div>
              <div className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">All prep tools</div>
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/50 bg-white/75 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/60 sm:p-8">
          <div className="mb-8 text-slate-900 dark:text-white">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-700 dark:text-cyan-300">{eyebrow}</p>
                <div className="mt-3">
                  <BrandMark invert={theme === "dark"} />
                </div>
                <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">{subtitle}</p>
              </div>
              <div className="hidden shrink-0 sm:block">
                <BrandMark compact invert={theme === "dark"} />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4" />
                Resume-led practice
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                <ShieldCheck className="h-4 w-4" />
                Secure local storage
              </div>
            </div>
          </div>

          {children}

          <p className="mt-8 text-center text-xs font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{caption}</p>
        </section>
      </div>
    </div>
  </div>
);

const PasswordField = ({ label, value, onChange, placeholder, name = undefined }) => {
  const [visible, setVisible] = useState(false);

  return (
    <Field label={label}>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
          <Lock className="h-5 w-5 text-slate-400 dark:text-slate-500" />
        </div>
        <input
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          className="auth-input auth-input--with-leading-icon auth-input--with-trailing-icon"
          placeholder={placeholder}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-2 inline-flex h-10 w-10 my-auto items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:text-slate-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </Field>
  );
};

export const LoginPage = ({ setAuthPage, onLoginSuccess, theme, onToggleTheme }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await window.storage.get(`user_${email}`);
      const user = JSON.parse(result.value);

      if (user.password !== password) {
        throw new Error("Incorrect password.");
      }

      await onLoginSuccess(user);
    } catch (loginError) {
      setError(loginError.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome Back"
      subtitle="Sign in to continue your interview practice, review your progress, and jump straight into the next mock session."
      theme={theme}
      onToggleTheme={onToggleTheme}
      eyebrow="Sign In"
      caption="Built for focused prep sessions and faster feedback loops"
    >
      <form onSubmit={handleLogin} className="space-y-5">
        {error ? <ErrorBanner message={error} /> : null}
        <Field label="Email">
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Mail className="h-5 w-5 text-slate-400 dark:text-slate-500" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="auth-input auth-input--with-leading-icon"
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>
        </Field>
        <PasswordField label="Password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />

        <div className="flex items-center justify-between rounded-2xl bg-slate-100/80 px-4 py-3 text-sm text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Secure local sign-in
          </span>
          <span>Pick up where you left off</span>
        </div>

        <button type="submit" disabled={loading} className="primary-button w-full justify-center">
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        No account yet?{" "}
        <button
          type="button"
          onClick={() => setAuthPage("signup")}
          className="font-semibold text-slate-900 underline decoration-2 underline-offset-4 dark:text-white"
        >
          Create one
        </button>
      </p>
    </AuthShell>
  );
};

export const SignupPage = ({ setAuthPage, onSignupSuccess, theme, onToggleTheme }) => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    setFormData((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  };

  const handleSignup = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (Object.values(formData).some((value) => !value.trim())) {
        throw new Error("Please fill all fields.");
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match.");
      }

      try {
        await window.storage.get(`user_${formData.email}`);
        throw new Error("An account with this email already exists.");
      } catch (lookupError) {
        if (lookupError.message === "An account with this email already exists.") {
          throw lookupError;
        }
      }

      const newUser = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        createdAt: new Date().toISOString(),
      };

      await window.storage.set(`user_${newUser.email}`, JSON.stringify(newUser));
      await onSignupSuccess(newUser);
    } catch (signupError) {
      setError(signupError.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create Account"
      subtitle="Set up your interview workspace and start building a stronger preparation rhythm from day one."
      theme={theme}
      onToggleTheme={onToggleTheme}
      eyebrow="Get Started"
      caption="Create your profile once, then keep every mock session in one place"
    >
      <form onSubmit={handleSignup} className="space-y-5">
        {error ? <ErrorBanner message={error} /> : null}
        <div className="grid grid-cols-2 gap-4">
          <Field label="First Name">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <UserCircle2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="auth-input auth-input--with-leading-icon"
                placeholder="Aarav"
                autoComplete="given-name"
              />
            </div>
          </Field>
          <Field label="Last Name">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <UserCircle2 className="h-5 w-5 text-slate-400 dark:text-slate-500" />
              </div>
              <input
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="auth-input auth-input--with-leading-icon"
                placeholder="Sharma"
                autoComplete="family-name"
              />
            </div>
          </Field>
        </div>
        <Field label="Email">
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
              autoComplete="email"
            />
          </div>
        </Field>
        <PasswordField
          label="Password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a secure password"
        />
        <PasswordField
          label="Confirm Password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Confirm your password"
        />

        <div className="rounded-[1.5rem] bg-slate-100/80 p-4 text-sm text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            What you unlock
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div className="rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-900/70">Resume analysis and ATS feedback</div>
            <div className="rounded-2xl bg-white/80 px-3 py-3 dark:bg-slate-900/70">Interview score tracking and practice history</div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="primary-button w-full justify-center">
          {loading ? "Creating account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-300">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setAuthPage("login")}
          className="font-semibold text-slate-900 underline decoration-2 underline-offset-4 dark:text-white"
        >
          Sign in
        </button>
      </p>
    </AuthShell>
  );
};
