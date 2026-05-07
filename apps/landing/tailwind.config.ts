import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: {
        "2xl": "1200px"
      }
    },
    extend: {
      colors: {
        surface: "var(--surface)",
        "surface-raised": "var(--surface-raised)",
        "surface-inverse": "var(--surface-inverse)",
        ink: "var(--ink)",
        "ink-muted": "var(--ink-muted)",
        "ink-inverse": "var(--ink-inverse)",
        signal: "var(--signal)",
        "signal-shadow": "var(--signal-shadow)",
        border: "var(--border)",
        "border-inverse": "var(--border-inverse)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        err: "var(--err)"
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      },
      fontSize: {
        eyebrow: ["0.75rem", { lineHeight: "0.95", letterSpacing: "0.08em", fontWeight: "600" }],
        caption: ["0.8125rem", { lineHeight: "1.4" }],
        body: ["1rem", { lineHeight: "1.55" }],
        lead: ["1.125rem", { lineHeight: "1.5" }],
        h3: ["1.375rem", { lineHeight: "1.25", fontWeight: "600" }],
        h2: ["1.875rem", { lineHeight: "1.15", fontWeight: "600" }],
        "h1-display": ["3.5rem", { lineHeight: "1.05", letterSpacing: "-0.02em" }]
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        pill: "999px"
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "accordion-down": {
          "0%": { height: "0" },
          "100%": { height: "var(--radix-accordion-content-height)" }
        },
        "accordion-up": {
          "0%": { height: "var(--radix-accordion-content-height)" },
          "100%": { height: "0" }
        }
      },
      animation: {
        "fade-in-up": "fade-in-up 200ms ease-out",
        "accordion-down": "accordion-down 200ms ease-out",
        "accordion-up": "accordion-up 200ms ease-out"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
