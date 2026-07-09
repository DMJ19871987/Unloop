"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolved: "light" | "dark";
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  resolved: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("light");

  const apply = useCallback((t: Theme) => {
    const root = document.documentElement;
    let dark = false;
    if (t === "dark") dark = true;
    else if (t === "system") {
      dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    root.classList.toggle("dark", dark);
    setResolved(dark ? "dark" : "light");
  }, []);

  const setTheme = useCallback(
    (t: Theme) => {
      setThemeState(t);
      localStorage.setItem("unloop-theme", t);
      apply(t);
    },
    [apply]
  );

  useEffect(() => {
    const stored = (localStorage.getItem("unloop-theme") as Theme) ?? "system";
    setThemeState(stored);
    apply(stored);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("unloop-theme") as Theme) === "system") apply("system");
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [apply]);

  return (
    <ThemeContext.Provider value={{ theme, resolved, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
