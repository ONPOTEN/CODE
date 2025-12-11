import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme color palette (Threads-inspired)
        primary: {
          DEFAULT: '#0095f6',
          light: '#1db4e6',
          dark: '#0076b0',
        },
        secondary: {
          DEFAULT: '#a8a8a8',
          light: '#d0d0d0',
          dark: '#737373',
        },
        // Background colors for dark theme
        bg: {
          base: '#000000',
          elevated: '#121212',
          hover: '#1a1a1a',
          secondary: '#262626',
        },
        // Text colors
        text: {
          primary: '#ffffff',
          secondary: '#e5e5e5',
          tertiary: '#a8a8a8',
          disabled: '#626262',
        },
        // Neutral grays for dark theme
        neutral: {
          50: '#fafafa',
          100: '#f0f0f0',
          200: '#e5e5e5',
          300: '#d0d0d0',
          400: '#a8a8a8',
          500: '#737373',
          600: '#626262',
          700: '#454545',
          800: '#262626',
          900: '#121212',
          950: '#000000',
        },
      },
      fontFamily: {
        sans: ['ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      spacing: {
        'sidebar': '250px',
        'sidebar-collapsed': '64px',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
      },
    },
  },
  plugins: [],
};

export default config;
