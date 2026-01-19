/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,scss}'],
  theme: {
    extend: {
      colors: {
        primary: '#FABB18',
        secondary: '#31A6E1',
        secondaryYellow: '#FFE999',
        secondaryGreen: '#71DD8C',
        secondaryGray: '#414651',
        gray: '#707070',
        grayDark: '#A2A8B3',
        grayLight: '#1C1C1C0D',
        grayBorder: '#E9EAEB',
        white: '#ffffff',
        black: '#000000',
        'black-40': 'rgba(0,0,0,0.4)',
        'black-10': '#1C1C1C1A',
      },
      fontFamily: {
        primary: ['Pretendard', 'sans-serif'],
        sans: ['Pretendard', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  important: true,
};
