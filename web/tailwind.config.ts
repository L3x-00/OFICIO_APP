import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#E07B39",
        "primary-dark": "#C96A2E",
        "primary-light": "#F49866",
        "primary-glow": "rgba(224, 123, 57, 0.4)",
        "bg-dark": "#0B0D17",
        "bg-card": "#15192B",
        "bg-input": "#1E2235",
        "text-primary": "#FFFFFF",
        "text-secondary": "#B0B8C8",
        "text-muted": "#6B7280",
        amber: "#F59E0B",
        green: "#10B981",
        red: "#EF4444",
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        card: "12px",
        button: "10px",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.16, 1, 0.3, 1)",
        bounce: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      boxShadow: {
        "glow-sm": "0 0 12px rgba(224, 123, 57, 0.25)",
        "glow-md": "0 0 24px rgba(224, 123, 57, 0.35)",
        "glow-lg": "0 0 40px rgba(224, 123, 57, 0.45)",
        "card-hover": "0 12px 32px -8px rgba(224, 123, 57, 0.25), 0 0 0 1px rgba(224, 123, 57, 0.15)",
        "inset-glow": "inset 0 1px 0 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "grid-pattern":
          "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
        "radial-primary":
          "radial-gradient(ellipse at top, rgba(224,123,57,0.18), transparent 60%)",
        "gradient-primary":
          "linear-gradient(135deg, #E07B39 0%, #F49866 100%)",
        "shimmer":
          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%)",
      },
      backgroundSize: {
        "grid-md": "48px 48px",
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
        spotlight: {
          "0%, 100%": { transform: "translate(-10%, -10%) scale(1)" },
          "50%": { transform: "translate(10%, 10%) scale(1.1)" },
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
        spotlight: "spotlight 14s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
