import React from "react";
import { ArrowUpRight } from "lucide-react";

export function average(numbers = []) {
  if (!numbers.length) return 0;
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}

export function formatDateTime(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString();
}

export function initials(name = "") {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function cleanSkills(skills = []) {
  return skills.filter(Boolean).slice(0, 8);
}

export const BRAND_NAME = "PERFEXA";
export const BRAND_TAGLINE = "Perfection and Excellence Defined";

export const BrandMark = ({ compact = false, invert = false }) => (
  <div className={`brand-mark ${compact ? "brand-mark--compact" : ""} ${invert ? "brand-mark--invert" : ""}`}>
    <div className="brand-mark__crest" aria-hidden="true">
      <span className="brand-mark__crown" />
      <span className="brand-mark__arrow">
        <ArrowUpRight className="h-5 w-5" strokeWidth={2.4} />
      </span>
    </div>
    <div>
      <div className="brand-mark__name">{BRAND_NAME}</div>
      {!compact ? <div className="brand-mark__tagline">{BRAND_TAGLINE}</div> : null}
    </div>
  </div>
);

export const RankBadge = ({ badge, size = "md", emphasize = false }) => {
  const sizeClasses = {
    sm: "h-10 w-10",
    md: "h-14 w-14",
    lg: "h-20 w-20",
    xl: "h-28 w-28",
  };

  const toneClasses = {
    slate: "text-slate-600 dark:text-slate-300",
    amber: "text-amber-500 dark:text-amber-300",
    zinc: "text-zinc-500 dark:text-zinc-300",
    yellow: "text-yellow-500 dark:text-yellow-300",
    cyan: "text-cyan-500 dark:text-cyan-300",
  };

  return (
    <div
      className={`${sizeClasses[size] || sizeClasses.md} rank-badge-swords ${
        toneClasses[badge?.accent] || toneClasses.slate
      } ${emphasize ? "rank-badge-swords--emphasize" : ""}`}
      aria-label={`${badge?.name || "Rank"} badge`}
    >
      <svg viewBox="0 0 64 64" className="h-full w-full" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M22 12L28 18L20 33L16 29L22 12Z" fill="currentColor" opacity="0.95" />
        <path d="M42 12L36 18L44 33L48 29L42 12Z" fill="currentColor" opacity="0.95" />
        <path d="M29 20L34 25L18 41L13 36L29 20Z" fill="currentColor" />
        <path d="M35 20L30 25L46 41L51 36L35 20Z" fill="currentColor" />
        <path d="M18 41L24 47L21 50L15 44L18 41Z" fill="currentColor" opacity="0.92" />
        <path d="M46 41L40 47L43 50L49 44L46 41Z" fill="currentColor" opacity="0.92" />
        <path d="M24 47L28 51L24 55L20 51L24 47Z" fill="currentColor" />
        <path d="M40 47L36 51L40 55L44 51L40 47Z" fill="currentColor" />
      </svg>
    </div>
  );
};

export const Field = ({ label, children }) => (
  <label className="block">
    <span className="mb-2 block text-sm font-medium text-slate-200">{label}</span>
    {children}
  </label>
);

export const ErrorBanner = ({ message }) => (
  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">{message}</div>
);

export const LoadingPanel = ({ title }) => (
  <div className="rounded-[2rem] bg-white p-8 text-center shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900 dark:border-slate-700 dark:border-t-slate-100" />
    <p className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</p>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Please wait while the system prepares your interview.</p>
  </div>
);

export const SummaryRow = ({ label, value }) => (
  <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{label}</p>
    <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200">{value}</p>
  </div>
);

const extractString = (item) => {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") {
    return item.title || item.name || item.description || item.summary || JSON.stringify(item);
  }
  return String(item);
};

export const TagList = ({ title, items, emptyLabel }) => (
  <div>
    {title ? <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4> : null}
    {items?.length ? (
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item, index) => (
          <span key={`tag-${index}`} className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {extractString(item)}
          </span>
        ))}
      </div>
    ) : (
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
    )}
  </div>
);

export const SimpleList = ({ title, items, emptyLabel }) => (
  <div>
    {title ? <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h4> : null}
    {items?.length ? (
      <ul className="mt-3 space-y-2">
        {items.map((item, index) => {
          const content = extractString(item);
          return (
            <li key={`list-item-${index}`} className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
              {item && typeof item === "object" && item.title && item.description ? (
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                  <div className="mt-1 text-slate-600 dark:text-slate-400">{item.description}</div>
                </div>
              ) : content}
            </li>
          );
        })}
      </ul>
    ) : (
      <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{emptyLabel}</p>
    )}
  </div>
);

export const InfoPanel = ({ title, items }) => (
  <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h3>
    <ul className="mt-4 space-y-3">
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-slate-900 dark:bg-slate-100" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  </div>
);

export const StatCard = ({ value, label, accent }) => (
  <div className={`rounded-[2rem] bg-gradient-to-br ${accent} p-6 text-white shadow-xl`}>
    <div className="text-4xl font-black">{value}</div>
    <div className="mt-2 text-sm font-medium text-white/80">{label}</div>
  </div>
);

export const FeatureCard = ({ icon, title, description }) => (
  <div className="rounded-[2rem] bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">{icon}</div>
    <h3 className="mt-4 text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{description}</p>
  </div>
);

export const FeedbackList = ({ title, icon, tone, items }) => {
  const toneClasses = {
    green: "border-green-200 bg-green-50 text-green-700 dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-200",
    red: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200",
  };

  return (
    <div className={`rounded-[2rem] border p-6 ${toneClasses[tone]}`}>
      <div className="flex items-center gap-2 text-lg font-bold">
        {icon}
        {title}
      </div>
      <ul className="mt-4 space-y-3">
        {items?.length ? (
          items.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-900/70">
              {item}
            </li>
          ))
        ) : (
          <li className="rounded-2xl bg-white/70 px-4 py-3 text-sm dark:bg-slate-900/70">Nothing recorded yet.</li>
        )}
      </ul>
    </div>
  );
};

export const ScoreBadge = ({ label, value, tone }) => {
  const tones = {
    green: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-200",
    yellow: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-200",
    red: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-200",
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-200",
  };

  return (
    <div className={`rounded-2xl px-4 py-3 text-center ${tones[tone] || tones.blue}`}>
      <div className="text-xs font-semibold uppercase tracking-[0.15em]">{label}</div>
      <div className="mt-1 text-lg font-black">{value}</div>
    </div>
  );
};

export const MiniPanel = ({ title, items, fallback }) => (
  <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-800">
    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</p>
    {items?.length ? (
      <ul className="mt-2 space-y-2 text-sm text-slate-600 dark:text-slate-300">
        {items.map((item, index) => (
          <li key={`${item}-${index}`} className="flex items-start gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-slate-900 dark:bg-slate-100" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    ) : (
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{fallback}</p>
    )}
  </div>
);

export const TypeCountCard = ({ title, count, icon }) => (
  <div className="rounded-[2rem] bg-white p-5 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">{title}</p>
        <div className="mt-3 text-4xl font-black text-slate-900 dark:text-slate-100">{count}</div>
      </div>
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900">{icon}</div>
    </div>
  </div>
);
