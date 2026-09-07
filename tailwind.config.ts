import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/design-system/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        canvas: "#000000",
        surface: {
          50: "#18181b",
          100: "#27272a",
          200: "#3f3f46",
          300: "#52525b",
          800: "#09090b",
          900: "#040405",
          base: "#09090b",
          elevated: "#121216",
          card: "#18181c",
          overlay: "#222228",
          hover: "#2c2c34",
          active: "#363640",
          border: "rgba(255, 255, 255, 0.08)",
          "border-strong": "rgba(255, 255, 255, 0.16)",
        },
        brand: {
          50: "#fdf2f8",
          100: "#fce7f3",
          500: "#f42567",
          600: "#e11d48",
          700: "#be123c",
          accent: "#f42567",
          gold: "#f59e0b",
        },
        accent: {
          DEFAULT: "#f42567",
          hover: "#e11d48",
          active: "#be123c",
          subtle: "rgba(244, 37, 103, 0.12)",
          glow: "rgba(244, 37, 103, 0.35)",
        },
        gold: {
          DEFAULT: "#f59e0b",
          hover: "#d97706",
          subtle: "rgba(245, 158, 11, 0.12)",
          glow: "rgba(245, 158, 11, 0.35)",
        },
        status: {
          live: "#22c55e",
          success: "#10b981",
          danger: "#ef4444",
          warning: "#f59e0b",
          info: "#3b82f6",
        },
      },
      fontSize: {
        "display-2xl": ["3.75rem", { lineHeight: "1", letterSpacing: "-0.04em" }],
        "display-xl": ["3rem", { lineHeight: "1.05", letterSpacing: "-0.035em" }],
        "display-lg": ["2.25rem", { lineHeight: "1.1", letterSpacing: "-0.03em" }],
        "heading-1": ["1.875rem", { lineHeight: "1.2", letterSpacing: "-0.025em" }],
        "heading-2": ["1.5rem", { lineHeight: "1.25", letterSpacing: "-0.02em" }],
        "heading-3": ["1.25rem", { lineHeight: "1.3", letterSpacing: "-0.015em" }],
        "heading-4": ["1.125rem", { lineHeight: "1.35", letterSpacing: "-0.01em" }],
        overline: ["0.6875rem", { lineHeight: "1rem", letterSpacing: "0.08em" }],
      },
      borderRadius: {
        xs: "4px",
        sm: "6px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        "2xl": "20px",
      },
      boxShadow: {
        ambient: "0 10px 30px -10px rgba(0, 0, 0, 0.8)",
        elevated: "0 20px 40px -15px rgba(0, 0, 0, 0.9)",
        "accent-glow": "0 0 20px rgba(244, 37, 103, 0.35)",
        "gold-glow": "0 0 20px rgba(245, 158, 11, 0.35)",
        "live-glow": "0 0 15px rgba(34, 197, 94, 0.4)",
      },
      transitionTimingFunction: {
        snappy: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
      keyframes: {
        "tip-pop": {
          "0%": { transform: "scale(0.85) translateY(12px)", opacity: "0" },
          "50%": { transform: "scale(1.04) translateY(-2px)", opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)", opacity: "1" },
        },
        "pulse-glow": {
          "0%, 100%": { boxShadow: "0 0 15px rgba(244, 37, 103, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(244, 37, 103, 0.75)" },
        },
        "live-beacon": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(1.2)" },
        },
        "modal-scale-in": {
          "0%": { opacity: "0", transform: "scale(0.96) translateY(8px)" },
          "100%": { opacity: "1", transform: "scale(1) translateY(0)" },
        },
        "drawer-bottom": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" },
        },
        "drawer-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "drawer-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        "toast-enter": {
          "0%": { opacity: "0", transform: "translateY(-12px) scale(0.95)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "tip-pop": "tip-pop 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "pulse-glow": "pulse-glow 2s infinite",
        "live-beacon": "live-beacon 1.5s infinite ease-in-out",
        "modal-in": "modal-scale-in 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "drawer-bottom": "drawer-bottom 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "drawer-right": "drawer-right 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "drawer-left": "drawer-left 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "toast-enter": "toast-enter 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        shimmer: "shimmer 2s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
