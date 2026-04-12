export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        obsidian: '#131315',
        neon: {
          cyan: '#00f2ff',
          purple: '#b600f8'
        },
        surface: {
          low: '#1c1b1d',
          mid: '#2a2a2c',
          high: '#353437'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
}