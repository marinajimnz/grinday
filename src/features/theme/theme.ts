const KEY = "grinday:theme";

export type ThemePreference = "system" | "light" | "dark";

export function getStoredTheme(): ThemePreference {
  try {
    const value = localStorage.getItem(KEY);
    return value === "light" || value === "dark" ? value : "system";
  } catch (err) {
    console.error("[theme] failed to read preference:", err);
    return "system";
  }
}

export function applyTheme(theme: ThemePreference) {
  try {
    if (theme === "system") {
      localStorage.removeItem(KEY);
      document.documentElement.removeAttribute("data-theme");
    } else {
      localStorage.setItem(KEY, theme);
      document.documentElement.setAttribute("data-theme", theme);
    }
  } catch (err) {
    console.error("[theme] failed to apply preference:", err);
  }
}
