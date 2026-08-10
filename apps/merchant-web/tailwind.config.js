/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef6ff',
          100: '#d9ecff',
          200: '#bcdcff',
          300: '#8ec5ff',
          400: '#59a6ff',
          500: '#2f83fb',
          600: '#1c63e6',
          700: '#164cb4',
          800: '#163f8f',
          900: '#173872',
        },
      },
    },
  },
  plugins: [],
};
