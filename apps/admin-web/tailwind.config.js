/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        admin: {
          50: '#f4f2ff',
          100: '#e8e4ff',
          200: '#cfc5ff',
          300: '#ab9aff',
          400: '#8569ff',
          500: '#6a44fb',
          600: '#5729e0',
          700: '#4720b3',
          800: '#3a1c8f',
          900: '#301b72',
        },
      },
    },
  },
  plugins: [],
};
