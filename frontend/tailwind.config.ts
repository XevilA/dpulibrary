/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // DPU official brand purple — RGB(96, 33, 245) -> #6021F5
        dpu: {
          DEFAULT: '#6021F5',
          50:  '#F3EFFF',
          100: '#E7DEFE',
          200: '#D2C1FD',
          300: '#B497FC',
          400: '#8E5EFA',
          500: '#6021F5', // RGB(96, 33, 245)
          600: '#5214E0',
          700: '#430EBF',
          800: '#370D9C',
          900: '#2D0D7E',
          950: '#190554',
        },
        // Accent gold for rankings/badges
        gold: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
      },
      fontFamily: {
        sans: ['Sarabun', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.08), 0 1px 2px -1px rgba(0,0,0,0.06)',
        'card-hover': '0 4px 12px 0 rgba(96,33,245,0.15), 0 2px 4px -1px rgba(0,0,0,0.06)',
      },
    },
  },
  plugins: [],
}
