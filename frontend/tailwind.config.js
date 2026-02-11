/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1976D2',
          hover: '#135BA1',
          light: '#E3F2FD',
        },
        success: {
          DEFAULT: '#2E7D32',
          light: '#E8F5E9',
        },
        warning: {
          DEFAULT: '#F57C00',
          light: '#FFF3E0',
        },
        error: {
          DEFAULT: '#C62828',
          light: '#FFEBEE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        hindi: ['Noto Sans Devanagari', 'system-ui', 'sans-serif'],
        tamil: ['Noto Sans Tamil', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
