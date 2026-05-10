import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Brand ────────────────────────────────────
        primary: "#E07B39",
        "primary-dark": "#C96A2E",
        "primary-light": "#F49866",
        "primary-darker": "#B25A24",
        amber: "#F59E0B",
        "amber-dark": "#B97506",
        green: "#16A36B",
        rose: "#E14B5A",
        red: "#EF4444",

        // ── Light theme (landing) ───────────────────
        paper: "#FBF7EE",
        "paper-warm": "#ECE6D6",
        surface: "#FFFFFF",
        "surface-2": "#FBF8F0",
        cream: "#FFF8E7",
        peach: "#FDEBD0",
        bone: "#FDFEFE",

        ink: "#14141C",
        "ink-2": "#2B2B38",
        "ink-3": "#4B4B59",
        "ink-4": "#717180",
        "ink-5": "#9A9AA8",

        line: "#ECE6D9",
        "line-2": "#DDD4BF",
        "line-3": "#C7BEA3",

        // ── Dark theme (panel/admin) — preserved ────
        night: "#1A1A2E",
        "night-2": "#20203A",
        "night-3": "#292947",
        "night-4": "#34345A",
        "night-line": "#2D2D4D",
        "night-text": "#EDEDF5",
        "night-text-2": "#B5B5CC",
        "night-text-3": "#7A7A95",

        // ── Legacy dark tokens (kept so panel doesn't break) ─
        "bg-dark": "#0B0D17",
        "bg-card": "#15192B",
        "bg-input": "#1E2235",
        "text-primary": "#FFFFFF",
        "text-secondary": "#B0B8C8",
        "text-muted": "#6B7280",
        "primary-glow": "rgba(224, 123, 57, 0.4)",
      },
      fontFamily: {
        sans: ["Geist", "Plus Jakarta Sans", "system-ui", "-apple-system", "sans-serif"],
        display: ["Sora", "Geist", "system-ui", "sans-serif"],
        mono: ["Geist Mono", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.03em",
        tighter: "-0.02em",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
        xl: "20px",
        "2xl": "28px",
        card: "14px",
        button: "10px",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      boxShadow: {
        // Light theme: layered low-opacity shadows
        soft: "0 1px 2px rgba(28,22,8,0.04), 0 8px 24px -12px rgba(28,22,8,0.10)",
        "soft-md": "0 1px 2px rgba(28,22,8,0.05), 0 12px 32px -14px rgba(28,22,8,0.14)",
        "soft-lg": "0 2px 4px rgba(28,22,8,0.06), 0 24px 48px -16px rgba(28,22,8,0.18)",
        ring: "0 0 0 1px rgba(20,20,28,0.04), 0 1px 2px rgba(28,22,8,0.04)",
        "orange-soft":
          "0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 16px -6px rgba(224,123,57,0.45), 0 1px 2px rgba(0,0,0,0.05)",
        "ink-soft":
          "0 1px 0 rgba(255,255,255,0.12) inset, 0 1px 2px rgba(0,0,0,0.2)",

        // Legacy glow (for panel)
        "glow-sm": "0 0 12px rgba(224, 123, 57, 0.25)",
        "glow-md": "0 0 24px rgba(224, 123, 57, 0.35)",
        "glow-lg": "0 0 40px rgba(224, 123, 57, 0.45)",
        "card-hover":
          "0 12px 32px -8px rgba(224, 123, 57, 0.25), 0 0 0 1px rgba(224, 123, 57, 0.15)",
        "inset-glow": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "grid-warm":
          "linear-gradient(rgba(20,20,28,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(20,20,28,0.04) 1px, transparent 1px)",
        "radial-primary":
          "radial-gradient(ellipse at top, rgba(224,123,57,0.18), transparent 60%)",
        "radial-warm":
          "radial-gradient(1200px 200px at 0% 0%, rgba(224,123,57,0.06), transparent 60%), radial-gradient(900px 220px at 100% 100%, rgba(245,158,11,0.05), transparent 60%)",
        "gradient-primary":
          "linear-gradient(135deg, #E07B39 0%, #F49866 100%)",
        "gradient-orange":
          "linear-gradient(135deg, #E07B39 0%, #C96A2E 100%)",
        "gradient-amber":
          "linear-gradient(135deg, #F59E0B 0%, #B97506 100%)",
        "gradient-ink":
          "linear-gradient(135deg, #2B2B38 0%, #14141C 100%)",
        "gradient-card":
          "linear-gradient(180deg, #FFFFFF 0%, #FDFAF1 100%)",
        shimmer:
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
      },
      backgroundSize: {
        "grid-md": "48px 48px",
        "grid-lg": "56px 56px",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(24px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.85" },
          "50%": { opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(224,123,57,0.45)" },
          "50%": { boxShadow: "0 0 0 12px rgba(224,123,57,0)" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-left": "slide-in-left 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "slide-in-right": "slide-in-right 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        shimmer: "shimmer 1.6s linear infinite",
        float: "float 7s ease-in-out infinite",
        "float-slow": "float 11s ease-in-out infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-out infinite",
        shake: "shake 0.4s ease-in-out",
      },
    },
  },
  plugins: [],
};
export default config;
