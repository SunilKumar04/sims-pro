import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#030810',
          900: '#050D1A',
          800: '#0A1628',
          700: '#0F2044',
          600: '#162952',
        },
        gold: {
          300: '#FFD966',
          400: '#F0C040',
          500: '#D4A017',
          600: '#B8860B',
        },
        brand: {
          primary: '#4F46E5',
          secondary: '#22C55E',
        },
      },
      fontFamily: {
        outfit: ['Outfit', 'sans-serif'],
        lora: ['Lora', 'serif'],
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'slide-in': 'slideIn 0.3s ease both',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        slideIn: {
          from: { opacity: '0', transform: 'translateX(-12px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
