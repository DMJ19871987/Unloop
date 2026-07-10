import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-muted": "var(--ink-muted)",
        "ink-faint": "var(--ink-faint)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        "accent-selected": "var(--accent-selected)",
        "accent-soft": "var(--accent-soft)",
        "accent-tint": "var(--accent-tint)",
        closed: "var(--closed)",
        sheet: "var(--sheet)",
        border: "var(--border)",
        "border-soft": "var(--border-soft)",
      },
      fontFamily: {
        heading: ["var(--font-heading)", "Georgia", "serif"],
        ui: ["var(--font-ui)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        subtle: "0 1px 3px rgba(43, 39, 36, 0.08)",
        sheet: "0 -20px 60px rgba(74, 58, 42, 0.14)",
        float: "var(--shadow-float)",
        soft: "var(--shadow-soft)",
      },
      borderRadius: {
        sheet: "32px",
      },
    },
  },
  plugins: [],
};

export default config;
