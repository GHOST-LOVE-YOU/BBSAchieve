"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/src/lib/utils";

const STORAGE_KEY = "byr-achieve.theme";

type Mode = "light" | "dark";

function applyTheme(mode: Mode) {
  document.documentElement.setAttribute("data-theme", mode);
}

function readInitialTheme(): Mode {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle({ className }: { className?: string }) {
  const [mode, setMode] = React.useState<Mode>("light");
  const [mounted, setMounted] = React.useState(false);

  // Run once on mount to sync state with whatever the inline <head> script set.
  React.useEffect(() => {
    const initial = readInitialTheme();
    setMode(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (e.g. private mode); ignore.
    }
  }

  return (
    <button
      type="button"
      aria-label={mode === "dark" ? "切换到浅色模式" : "切换到深色模式"}
      onClick={toggle}
      className={cn(
        "grid h-9 w-9 place-items-center rounded-full text-[color:var(--ink-secondary)] transition-colors hover:bg-[color:var(--canvas-soft)]",
        className,
      )}
    >
      {mounted && mode === "dark" ? (
        <Sun aria-hidden className="h-5 w-5" />
      ) : (
        <Moon aria-hidden className="h-5 w-5" />
      )}
    </button>
  );
}
