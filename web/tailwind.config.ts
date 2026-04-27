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
    },
  },
  plugins: [],
};
export default config;