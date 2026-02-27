/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        bg: '#FFFFFF',
        surface: '#F8FAFC',
        border: '#CBD5E1',
        accent: '#3B82F6',
        mono: '#475569',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        heading: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      keyframes: {
        // ✅ Progress bar animation
        loading: {
          '0%': { width: '0%' },
          '100%': { width: '100%' },
        },
      },
      animation: {
        // ✅ 30 second progress bar
        'loading': 'loading 30s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};