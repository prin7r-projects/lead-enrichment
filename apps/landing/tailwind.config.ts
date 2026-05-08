import type { Config } from "tailwindcss";

/**
 * Triangulate — Tailwind theme.
 * Aligned to Stripe's "architectural blueprint on white marble" reference
 * (see DESIGN.md §4 + §5). Canvas is platinum white; the only chromatic
 * accent is Deep Violet. Type scale mirrors the Söhne-var scale Stripe ships.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: {
        "2xl": "1200px"
      }
    },
    extend: {
      colors: {
        // Surfaces — Stripe palette
        platinum: "var(--platinum)", // #FFFFFF — primary canvas
        porcelain: "var(--porcelain)", // #F8FAFD — secondary card surfaces
        powder: "var(--powder)", // #E5EDF5 — alt section background
        stone: "var(--stone)", // #D8D6DF — hairline rules
        // Ink
        midnight: "var(--midnight)", // #061B31 — primary text
        slate: "var(--slate)", // #50617A — secondary text
        ghost: "var(--ghost)", // #64748D — tertiary text
        // Brand accent
        violet: "var(--violet)", // #533AFD — primary action
        "violet-shadow": "var(--violet-shadow)", // hover/active
        "violet-soft": "var(--violet-soft)", // #8087FF — decorative
        "violet-washed": "var(--violet-washed)", // #B9B9F9 — outline borders
        // Semantic
        ok: "var(--ok)",
        warn: "var(--warn)",
        err: "var(--err)",
        // Mapped legacy tokens (a few components still reference these)
        surface: "var(--platinum)",
        "surface-raised": "var(--porcelain)",
        "surface-inverse": "var(--midnight)",
        ink: "var(--midnight)",
        "ink-muted": "var(--slate)",
        "ink-inverse": "var(--platinum)",
        signal: "var(--violet)",
        "signal-shadow": "var(--violet-shadow)",
        border: "var(--border)",
        "border-inverse": "var(--border-inverse)"
      },
      fontFamily: {
        // Display / UI — Söhne substitute (Geist). Weight 300 is the display weight.
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-sans)", "ui-sans-serif", "system-ui", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        // Mono — Berkeley Mono substitute (IBM Plex Mono).
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"]
      },
      fontSize: {
        // Stripe type scale — see DESIGN.md §5
        caption: ["11px", { lineHeight: "1.45", letterSpacing: "0.03px" }],
        body: ["14px", { lineHeight: "1.4", letterSpacing: "0.003px" }],
        lead: ["16px", { lineHeight: "1.5", letterSpacing: "0px" }],
        subheading: ["18px", { lineHeight: "1.25", letterSpacing: "-0.009em" }],
        "heading-sm": ["22px", { lineHeight: "1.2", letterSpacing: "-0.01em" }],
        heading: ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em" }],
        "heading-lg": ["44px", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        display: ["56px", { lineHeight: "1.07", letterSpacing: "-0.03em" }],
        // Legacy tokens kept for component-internal references
        eyebrow: ["11px", { lineHeight: "1.45", letterSpacing: "0.08em", fontWeight: "500" }],
        h3: ["22px", { lineHeight: "1.2", letterSpacing: "-0.01em", fontWeight: "400" }],
        h2: ["32px", { lineHeight: "1.15", letterSpacing: "-0.02em", fontWeight: "300" }],
        "h1-display": ["56px", { lineHeight: "1.07", letterSpacing: "-0.03em", fontWeight: "300" }]
      },
      borderRadius: {
        sm: "4px",
        md: "4px", // Stripe is tight: buttons & inputs are 4px
        lg: "6px", // Cards
        xl: "8px",
        pill: "999px"
      },
      boxShadow: {
        card: "rgba(23, 23, 23, 0.06) 0px 3px 6px 0px",
        "card-hover": "rgba(50, 50, 93, 0.08) 0px 16px 32px -8px, rgba(23, 23, 23, 0.04) 0px 3px 6px 0px",
        feature: "rgba(50, 50, 93, 0.06) 0px 16px 32px 0px, rgba(23, 23, 23, 0.04) 0px 3px 6px 0px",
        ring: "rgba(83, 58, 253, 0.12) 0px 0px 0px 4px"
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
      },
      backgroundImage: {
        "dreamy-violet":
          "radial-gradient(circle at 70% 0%, rgba(127,125,252,0.18), rgba(244,75,204,0.10) 35%, rgba(229,237,245,0) 70%)",
        "sunburst":
          "linear-gradient(90deg, rgb(114, 50, 241) 3.13%, rgb(251, 118, 250) 50%, rgb(255, 207, 94))",
        "marble-fade":
          "linear-gradient(180deg, rgba(127,125,252,0.05) 0%, rgba(255,255,255,0) 60%)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
