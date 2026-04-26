"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

/**
 * Light/Dark switcher styled to fit inside the ProfileDrawer
 * alongside the menu links. Uses next-themes; renders a skeleton
 * until mounted to avoid hydration mismatch.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div className="h-12 mx-3 rounded-xl bg-slate-50 dark:bg-slate-900 animate-pulse" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
    >
      <span className="text-lg">{isDark ? "☀️" : "🌙"}</span>
      <div className="flex-1 text-left">
        <p className="text-sm font-medium">{isDark ? "Light mode" : "Dark mode"}</p>
        <p className="text-xs text-slate-900/50 dark:text-white/50">
          Currently {isDark ? "dark" : "light"}
        </p>
      </div>
      {/* Switch visual */}
      <div
        className={`relative w-10 h-6 rounded-full transition-colors ${
          isDark
            ? "bg-gradient-to-br from-violet-500 to-indigo-500"
            : "bg-slate-200 dark:bg-slate-700"
        }`}
        aria-hidden
      >
        <div
          className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
            isDark ? "translate-x-[1.125rem]" : "translate-x-0.5"
          }`}
        />
      </div>
    </button>
  );
}
