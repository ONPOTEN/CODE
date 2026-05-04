import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./contexts/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Facebook-inspired color palette
        fb: {
          // Brand blue
          blue: '#1877f2',
          'blue-dark': '#166fe5',
          'blue-light': '#42b0ff',
          // Background grays
          bg: '#f0f2f5',
          'bg-hover': '#e4e6eb',
          'bg-active': '#d8dadf',
          'bg-card': '#ffffff',
          // Text colors
          text: '#050505',
          'text-secondary': '#65676b',
          'text-muted': '#b0b3b8',
          // Divider
          divider: '#ced0d4',
          // Input
          input: '#f0f2f5',
          'input-hover': '#e4e6eb',
          // Success/Error states
          success: '#31a24c',
          error: '#f02849',
          warning: '#f5c33b',
        },
        // Semantic color aliases
        primary: {
          DEFAULT: '#1877f2',
          light: '#42b0ff',
          dark: '#166fe5',
        },
        secondary: {
          DEFAULT: '#65676b',
          light: '#8a8d91',
          dark: '#4e5053',
        },
        // Background colors
        bg: {
          base: '#f0f2f5',
          card: '#ffffff',
          hover: '#e4e6eb',
          active: '#d8dadf',
          secondary: '#f0f2f5',
          overlay: 'rgba(255, 255, 255, 0.95)',
        },
        // Text colors
        text: {
          primary: '#050505',
          secondary: '#65676b',
          tertiary: '#8a8d91',
          muted: '#b0b3b8',
          disabled: '#bcc0c4',
        },
        // Neutral grays
        neutral: {
          50: '#f7f8fa',
          100: '#f0f2f5',
          150: '#e4e6eb',
          200: '#d8dadf',
          300: '#bcc0c4',
          400: '#8a8d91',
          500: '#65676b',
          600: '#4e5053',
          700: '#3a3b3c',
          800: '#242526',
          900: '#18191a',
          950: '#050505',
        },
      },
      fontFamily: {
        sans: [
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        facebook: [
          'Facebook Faces',
          'Segoe UI',
          'system-ui',
          '-apple-system',
          'sans-serif',
        ],
      },
      fontSize: {
        'fb-xs': '0.75rem',    // 12px
        'fb-sm': '0.8125rem',  // 13px
        'fb-base': '0.875rem', // 14px
        'fb-md': '0.9375rem',  // 15px
        'fb-lg': '1rem',       // 16px
        'fb-xl': '1.0625rem',  // 17px
        'fb-2xl': '1.25rem',   // 20px
        'fb-3xl': '1.5rem',    // 24px
      },
      spacing: {
        'fb-sidebar': '280px',
        'fb-feed': '680px',
        'fb-rail': '280px',
        'fb-header': '56px',
      },
      borderRadius: {
        'fb': '8px',
        'fb-lg': '12px',
        'fb-xl': '16px',
        'fb-circle': '50%',
        'fb-pill': '9999px',
      },
      boxShadow: {
        'fb-card': '0 1px 2px rgba(0, 0, 0, 0.1)',
        'fb-floating': '0 2px 8px rgba(0, 0, 0, 0.15)',
        'fb-modal': '0 4px 24px rgba(0, 0, 0, 0.2)',
        'fb-dropdown': '0 2px 16px rgba(0, 0, 0, 0.12)',
      },
      backgroundColor: {
        'fb-hover': 'rgba(0, 0, 0, 0.05)',
        'fb-active': 'rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
};

export default config;
