/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          900: '#0B0A1A',
          800: '#14122D',
          700: '#1E1A42',
          600: '#2A245C',
        },
        neon: {
          purple: '#9d4edd',
          pink: '#f72585',
          blue: '#4cc9f0',
          indigo: '#4361ee',
          cyan: '#00f5d4',
          gold: '#ffd166',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow-pulse': 'glow 2s ease-in-out infinite alternate',
        'float': 'float 6s ease-in-out infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 15px rgba(157, 78, 221, 0.4), 0 0 30px rgba(76, 201, 240, 0.2)' },
          '100%': { boxShadow: '0 0 25px rgba(157, 78, 221, 0.8), 0 0 50px rgba(76, 201, 240, 0.5)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
