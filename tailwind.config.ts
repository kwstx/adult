import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        surface: {
          50: "#18181b",
          100: "#27272a",
          200: "#3f3f46",
          300: "#52525b",
          800: "#09090b",
          900: "#040405",
        },
        brand: {
          50: "#fdf2f8",
          500: "#ec4899",
          600: "#db2777",
          700: "#be185d",
          accent: "#8b5cf6",
          gold: "#f59e0b",
        },
      },
      keyframes: {
        "tip-pop": {
          "0%": { transform: "scale(0.8) translateY(10px)", opacity: "0" },
          "50%": { transform: "scale(1.05) translateY(-2px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(236, 72, 153, 0.4)" },
          "50%": { boxShadow: "0 0 30px rgba(236, 72, 153, 0.8)" },
        },
      },
      animation: {
        "tip-pop": "tip-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulse-glow 2s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
