"use client";

import { useSyncExternalStore } from "react";

const THEME_STORAGE_KEY = "workouter-theme";

type ThemeMode = "dark" | "light";

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_STORAGE_KEY) {
      callback();
    }
  };

  const onThemeChange = () => {
    callback();
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener("workouter-theme-change", onThemeChange);

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("workouter-theme-change", onThemeChange);
  };
}

function getSnapshot(): ThemeMode {
  const theme = document.documentElement.dataset.theme;
  return theme === "light" ? "light" : "dark";
}

function getServerSnapshot(): ThemeMode {
  return "dark";
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  window.dispatchEvent(new Event("workouter-theme-change"));
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      aria-label="Toggle theme"
      className="theme-toggle"
      onClick={() => applyTheme(nextTheme)}
      type="button"
    >
      <span className="theme-toggle-icon" aria-hidden="true">
        ◐
      </span>
      <span className="theme-toggle-label">Theme</span>
    </button>
  );
}
