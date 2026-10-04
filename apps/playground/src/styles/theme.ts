export const theme = {
  colors: {
    background: "#FFFFFF",
    surface: "#F7F9FA",
    foreground: "#05192D",
    secondaryText: "#576370",
    primary: "#03EF62",
    primaryDark: "#02C84F",
    accent: "#6C63FF",
    codeBg: "#f5f5f5",
    codeText: "#1b1b1b",
    border: "#E8E8EA",
    dimmed: "rgba(0, 0, 0, 0.1)",
    highlight: "rgba(3, 239, 98, 0.12)",
    slideBackground: "#FFFFFF",
  },
  fonts: {
    heading:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  slide: {
    width: 980,
    height: 552,
    padding: "40px 56px",
  },
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "24px",
    xl: "32px",
    xxl: "48px",
  },
  radii: {
    sm: "4px",
    md: "8px",
    lg: "12px",
  },
};

export type Theme = typeof theme;
