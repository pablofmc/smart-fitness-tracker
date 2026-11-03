"use client";

import { useSyncExternalStore } from "react";
import { parseTheme, THEME_STORAGE_KEY, themeAttribute, type Theme } from "@/lib/theme";

const OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "system", label: "Sistema", icon: "M4 5h16v11H4zM8 20h8M12 16v4" },
  {
    value: "light",
    label: "Claro",
    icon: "M12 4V2M12 22v-2M4 12H2M22 12h-2M5.6 5.6L4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4l-1.4 1.4M19.8 4.2l-1.4 1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  },
  { value: "dark", label: "Oscuro", icon: "M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" },
];

const THEME_EVENT = "themechange";
const DARK_QUERY = "(prefers-color-scheme: dark)";

function readTheme(): Theme {
  try {
    return parseTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
}

function pickTheme(theme: Theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Blocked storage: the theme still applies until the next reload.
  }
  const attribute = themeAttribute(theme);
  if (attribute) document.documentElement.dataset.theme = attribute;
  else delete document.documentElement.dataset.theme;
  window.dispatchEvent(new Event(THEME_EVENT));
}

function subscribeTheme(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(THEME_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function subscribeDevice(onChange: () => void) {
  const query = window.matchMedia(DARK_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

export function ThemeSelector() {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, () => "system" as Theme);
  const deviceDark = useSyncExternalStore(subscribeDevice, () => window.matchMedia(DARK_QUERY).matches, () => false);

  const note =
    theme === "system"
      ? `Ahora en ${deviceDark ? "oscuro" : "claro"}, como tu dispositivo.`
      : `Siempre en ${theme === "dark" ? "oscuro" : "claro"}, sin importar el dispositivo.`;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Tema</legend>
      <div className="grid grid-cols-3 gap-1 rounded-2xl bg-sunk p-1">
        {OPTIONS.map((option) => {
          const on = theme === option.value;
          return (
            <label
              key={option.value}
              className={`flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl text-[13px] font-bold outline-primary has-focus-visible:outline-2 has-focus-visible:outline-offset-2 ${
                on ? "bg-primary text-on-primary" : "text-ink-soft"
              }`}
            >
              <input
                type="radio"
                name="theme"
                value={option.value}
                checked={on}
                onChange={() => pickTheme(option.value)}
                className="sr-only"
              />
              <svg viewBox="0 0 24 24" aria-hidden className="size-[18px] fill-none stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d={option.icon} />
              </svg>
              {option.label}
            </label>
          );
        })}
      </div>
      <span aria-live="polite" className="text-[13px] text-muted">
        {note}
      </span>
    </fieldset>
  );
}
