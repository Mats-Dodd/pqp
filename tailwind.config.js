/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    fontFamily: {
      sans: ['Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
      mono: ['JetBrains Mono', 'IBM Plex Mono', 'Source Code Pro', 'monospace'],
    },
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      black: '#101010',
      white: '#FFFFFF',
      grid: '#1F1F1F',
      accent: {
        red: '#E30613',
        blue: '#00AEEF',
        yellow: '#FFEB00',
      },
    },
    extend: {
      spacing: {
        'ch': '1ch',
        '2ch': '2ch',
        '4ch': '4ch',
      },
      gridTemplateColumns: {
        '12-mono': 'repeat(12, minmax(0, 4ch))',
        '8-mono': 'repeat(8, minmax(0, 4ch))',
        '4-mono': 'repeat(4, minmax(0, 4ch))',
      },
      lineHeight: {
        'normal': '1.5',
      },
    },
  },
  plugins: [],
} 