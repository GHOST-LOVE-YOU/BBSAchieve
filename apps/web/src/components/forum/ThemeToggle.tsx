"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";

import { cn } from "@/src/lib/utils";

const STORAGE_KEY = "byr-achieve.theme";
const THEME_CHANGE_EVENT = "byr-achieve:theme-change";

type Mode = "light" | "dark";

function applyTheme(mode: Mode) {
  document.documentElement.setAttribute("data-theme", mode);
}

function readInitialTheme(): Mode {
  if (typeof window === "undefined") return "light";
  try {
    const stored = window.localStorage?.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    // localStorage can be unavailable in restricted browsers or tests.
  }
  try {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

function subscribeTheme(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const mediaQuery = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
  window.addEventListener("storage", listener);
  window.addEventListener(THEME_CHANGE_EVENT, listener);
  mediaQuery?.addEventListener?.("change", listener);

  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(THEME_CHANGE_EVENT, listener);
    mediaQuery?.removeEventListener?.("change", listener);
  };
}

function announceThemeChange() {
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function ThemeToggle({ className }: { className?: string }) {
  const mode = React.useSyncExternalStore(
    // Keep the snapshot typed as Mode so theme application stays narrow.
    subscribeTheme,
    readInitialTheme,
    () => "light" as Mode,
  );

  React.useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  function toggle() {
    const next: Mode = mode === "dark" ? "light" : "dark";
    applyTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // localStorage may be unavailable (e.g. private mode); ignore.
    }
    announceThemeChange();
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
      {mode === "dark" ? (
        <Sun aria-hidden className="h-5 w-5" />
      ) : (
        <Moon aria-hidden className="h-5 w-5" />
      )}
    </button>
  );
}
