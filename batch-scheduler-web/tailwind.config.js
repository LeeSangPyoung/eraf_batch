/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,scss}'],
  theme: {
    extend: {
      colors: {
        // Apple Style Colors
        primary: '#0071E3',           // Apple Blue
        secondary: '#86868B',         // Apple Gray
        accent: '#0071E3',            // Apple Blue (accent)
        success: '#34C759',           // Apple Green
        warning: '#FF9500',           // Apple Orange
        error: '#FF3B30',             // Apple Red

        // Backgrounds
        background: '#FFFFFF',
        backgroundSecondary: '#F5F5F7',
        backgroundTertiary: '#FBFBFD',

        // Text
        textPrimary: '#1D1D1F',
        textSecondary: '#86868B',
        textTertiary: '#AEAEB2',

        // Borders & Dividers
        border: '#D2D2D7',
        borderLight: '#E8E8ED',
        divider: '#D2D2D7',

        // Legacy support (mapped to new colors)
        secondaryYellow: '#FF9500',
        secondaryGreen: '#34C759',
        secondaryGray: '#86868B',
        gray: '#86868B',
        grayDark: '#636366',
        grayLight: '#F5F5F7',
        grayBorder: '#D2D2D7',
        white: '#FFFFFF',
        black: '#1D1D1F',
        'black-40': 'rgba(29,29,31,0.4)',
        'black-10': 'rgba(29,29,31,0.1)',
      },
      fontFamily: {
        primary: ['-apple-system', 'BlinkMacSystemFont', 'Pretendard', 'sans-serif'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Pretendard', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'apple': '12px',
        'apple-lg': '16px',
        'apple-xl': '20px',
      },
      boxShadow: {
        'apple': '0 4px 12px rgba(0,0,0,0.08)',
        'apple-md': '0 8px 24px rgba(0,0,0,0.12)',
        'apple-lg': '0 12px 40px rgba(0,0,0,0.16)',
        'apple-button': '0 1px 3px rgba(0,0,0,0.1)',
      },
      transitionDuration: {
        'apple': '300ms',
      },
      transitionTimingFunction: {
        'apple': 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      },
    },
  },
  plugins: [],
  important: true,
};
