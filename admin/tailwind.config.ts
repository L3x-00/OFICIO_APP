import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        /* Surface system */
        surface: {
          0: '#080B14',
          1: '#0D1117',
          2: '#111827',
          3: '#161D2B',
          4: '#1C2537',
          5: '#1F2A3D',
          6: '#243044',
        },
        /* Brand */
        brand: {
          DEFAULT: '#3B82F6',
          light: '#60A5FA',
          dark: '#1D4ED8',
        },
        /* Status */
        success: { DEFAULT: '#10B981', light: '#34D399', dark: '#059669' },
        warning: { DEFAULT: '#F59E0B', light: '#FBB740', dark: '#D97706' },
        danger:  { DEFAULT: '#EF4444', light: '#F87171', dark: '#DC2626' },
        info:    { DEFAULT: '#3B82F6', light: '#60A5FA', dark: '#1D4ED8' },
        purple:  { DEFAULT: '#8B5CF6', light: '#A78BFA', dark: '#7C3AED' },
        orange:  { DEFAULT: '#F97316', light: '#FB923C', dark: '#EA580C' },
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      boxShadow: {
        sm: '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)',
        md: '0 4px 16px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.3)',
        lg: '0 8px 32px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.3)',
        xl: '0 16px 48px rgba(0,0,0,0.5), 0 8px 24px rgba(0,0,0,0.4)',
        'glow-blue':  '0 0 20px rgba(59,130,246,0.25)',
        'glow-green': '0 0 20px rgba(16,185,129,0.25)',
        'glow-red':   '0 0 20px rgba(239,68,68,0.25)',
      },
      animation: {
        'fade-in':   'fadeIn 0.25s ease forwards',
        'slide-in':  'slideInLeft 0.2s ease forwards',
        'pulse-ring': 'pulse-ring 2s infinite',
        'shimmer':    'shimmer 1.5s infinite',
      },
      keyframes: {
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideInLeft: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to:   { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-ring': {
          '0%':   { boxShadow: '0 0 0 0 rgba(239,68,68,0.4)' },
          '70%':  { boxShadow: '0 0 0 8px rgba(239,68,68,0)' },
          '100%': { boxShadow: '0 0 0 0 rgba(239,68,68,0)' },
        },
        shimmer: {
          '0%':   { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
    },
  },
  plugins: [],
};

export default config;