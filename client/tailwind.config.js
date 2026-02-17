/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
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