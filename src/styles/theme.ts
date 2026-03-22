export const theme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F7F9FA',
    foreground: '#05192D',
    secondaryText: '#576370',
    primary: '#03EF62',
    primaryDark: '#02C84F',
    accent: '#6C63FF',
    codeBg: '#F6F8FA',
    codeText: '#24292F',
    border: '#E8E8EA',
    dimmed: 'rgba(0, 0, 0, 0.25)',
    highlight: 'rgba(3, 239, 98, 0.12)',
    slideBackground: '#FFFFFF',
  },
  fonts: {
    heading: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
  },
  slide: {
    width: 980,
    height: 552,
    padding: '48px 64px',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px',
  },
  radii: {
    sm: '4px',
    md: '8px',
    lg: '12px',
  },
}

export type Theme = typeof theme
