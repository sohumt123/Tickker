// Exact design system from Tickker frontend
export const colors = {
  // Primary colors
  primary: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  
  // Success colors
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  
  // Danger colors
  danger: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  
  // Slate colors
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
}

export const gradients = {
  background: 'linear-gradient(to bottom right, #f8fafc, #f1f5f9)', // Consistent light background
  brand: 'linear-gradient(to right, #4f46e5, #d946ef, #06b6d4)', // Purple gradient for ALL bold text
  card: 'rgba(255, 255, 255, 0.9)',
}

// Consistent text styles
export const textStyles = {
  mainTitle: {
    background: 'linear-gradient(to right, #4f46e5, #d946ef, #06b6d4)',
    backgroundClip: 'text',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    fontWeight: '800',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  subtitle: {
    color: '#0f172a', // ALL subtext black
    fontFamily: 'Inter, system-ui, sans-serif',
  },
}

export const fonts = {
  family: 'Inter, system-ui, sans-serif',
  mono: 'JetBrains Mono, monospace',
}

export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  DEFAULT: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  soft: '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
}

export const chartColors = {
  portfolio: 'rgb(79, 70, 229)', // primary-600
  spy: 'rgb(148, 163, 184)', // slate-400
  portfolioArea: 'rgba(79, 70, 229, 0.12)',
  spyArea: 'rgba(148, 163, 184, 0.18)',
  grid: 'rgba(148, 163, 184, 0.1)',
  text: 'rgb(148, 163, 184)',
}