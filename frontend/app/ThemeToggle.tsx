// ...existing code...
"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("theme");
      if (v) return v === "dark";
      // fallback to system preference
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    try {
      localStorage.setItem("theme", isDark ? "dark" : "light");
    } catch {}
  }, [isDark]);

  return (
    <button
      onClick={() => setIsDark(!isDark)}
      aria-label="Toggle theme"
      className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full shadow-sm hover:scale-105 transition-transform"
    >
      <span className="w-5 h-5 text-slate-700 dark:text-slate-200">
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
      </span>
      <span className="text-xs text-slate-700 dark:text-slate-300">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}