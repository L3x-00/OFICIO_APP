import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          dark:  '#0B0D17',
          card:  '#15192B',
          input: '#1E2235',
        },
        primary: {
          DEFAULT: '#00C6FF',
          dark:    '#0072FF',
        },
        success: '#00E676',
        warning: '#FF9800',
        danger:  '#FF3D00',
        muted:   '#6B7280',
      },
    },
  },
  plugins: [],
};

export default config;