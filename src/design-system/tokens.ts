/**
 * AuraLive Design Tokens
 * Single source of truth for design parameters, enforcing a dark, minimalist, and edgy visual identity.
 */

export const tokens = {
  colors: {
    // Neutral Carbon Scale
    canvas: "#000000",
    surface: {
      base: "#09090b", // Deep container background
      elevated: "#121216", // Floating panels / cards
      card: "#18181c", // Secondary cards & interactive items
      overlay: "#222228", // Popovers, modals, dropdowns
      hover: "#2c2c34", // Hover highlights
      active: "#363640", // Active pressed state
      border: "rgba(255, 255, 255, 0.08)", // Crisp subtle 1px border
      borderHighlight: "rgba(255, 255, 255, 0.16)", // Focused or elevated border
    },
    // Signature Electric Accent (Rose / Magenta)
    accent: {
      DEFAULT: "#f42567",
      hover: "#e11d48",
      active: "#be123c",
      subtle: "rgba(244, 37, 103, 0.12)",
      glow: "rgba(244, 37, 103, 0.35)",
      gradientStart: "#f42567",
      gradientEnd: "#9333ea",
    },
    // VIP & Whale Tier Metallic Gold
    gold: {
      DEFAULT: "#f59e0b",
      hover: "#d97706",
      subtle: "rgba(245, 158, 11, 0.12)",
      glow: "rgba(245, 158, 11, 0.35)",
    },
    // Status Colors
    status: {
      live: "#22c55e",
      liveGlow: "rgba(34, 197, 94, 0.4)",
      success: "#10b981",
      danger: "#ef4444",
      warning: "#f59e0b",
      info: "#3b82f6",
    },
    // Typography Colors
    text: {
      primary: "#fafafa",
      secondary: "#a1a1aa",
      muted: "#71717a",
      subtle: "#52525b",
      accent: "#f42567",
      gold: "#f59e0b",
    },
  },
  typography: {
    fontFamilies: {
      sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
      mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      display: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    display: {
      "2xl": { fontSize: "3.75rem", lineHeight: "1", letterSpacing: "-0.04em", fontWeight: "800" },
      xl: { fontSize: "3rem", lineHeight: "1.05", letterSpacing: "-0.035em", fontWeight: "750" },
      lg: { fontSize: "2.25rem", lineHeight: "1.1", letterSpacing: "-0.03em", fontWeight: "700" },
    },
    heading: {
      h1: { fontSize: "1.875rem", lineHeight: "1.2", letterSpacing: "-0.025em", fontWeight: "700" },
      h2: { fontSize: "1.5rem", lineHeight: "1.25", letterSpacing: "-0.02em", fontWeight: "650" },
      h3: { fontSize: "1.25rem", lineHeight: "1.3", letterSpacing: "-0.015em", fontWeight: "600" },
      h4: { fontSize: "1.125rem", lineHeight: "1.35", letterSpacing: "-0.01em", fontWeight: "600" },
      h5: { fontSize: "1rem", lineHeight: "1.4", letterSpacing: "-0.005em", fontWeight: "600" },
      h6: { fontSize: "0.875rem", lineHeight: "1.4", letterSpacing: "0", fontWeight: "600" },
    },
    body: {
      lg: { fontSize: "1.125rem", lineHeight: "1.5", letterSpacing: "-0.01em" },
      base: { fontSize: "1rem", lineHeight: "1.5", letterSpacing: "-0.005em" },
      sm: { fontSize: "0.875rem", lineHeight: "1.45", letterSpacing: "0" },
      xs: { fontSize: "0.75rem", lineHeight: "1.4", letterSpacing: "0.01em" },
    },
    overline: {
      fontSize: "0.6875rem",
      lineHeight: "1rem",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
      fontWeight: "700",
    },
  },
  spacing: {
    "2xs": "0.125rem", // 2px
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "0.75rem", // 12px
    lg: "1rem", // 16px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "2rem", // 32px
    "4xl": "2.5rem", // 40px
    "5xl": "3rem", // 48px
    "6xl": "4rem", // 64px
  },
  radii: {
    none: "0px",
    xs: "4px",
    sm: "6px",
    md: "8px",
    lg: "12px",
    xl: "16px",
    "2xl": "20px",
    full: "9999px",
  },
  shadows: {
    ambient: "0 10px 30px -10px rgba(0, 0, 0, 0.8)",
    elevated: "0 20px 40px -15px rgba(0, 0, 0, 0.9)",
    accentGlow: "0 0 20px rgba(244, 37, 103, 0.35)",
    goldGlow: "0 0 20px rgba(245, 158, 11, 0.35)",
    liveGlow: "0 0 15px rgba(34, 197, 94, 0.4)",
  },
  motion: {
    duration: {
      fast: "150ms",
      normal: "250ms",
      slow: "400ms",
    },
    easing: {
      default: "cubic-bezier(0.16, 1, 0.3, 1)", // Snappy Apple-like ease-out
      spring: "cubic-bezier(0.34, 1.56, 0.64, 1)", // Subtle micro bounce
      easeOut: "cubic-bezier(0, 0, 0.2, 1)",
    },
  },
  zIndex: {
    canvas: 0,
    base: 10,
    sticky: 20,
    dropdown: 30,
    modalBackdrop: 40,
    modal: 50,
    drawer: 55,
    toast: 60,
    tooltip: 70,
  },
} as const;

export type DesignTokens = typeof tokens;
