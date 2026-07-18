/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        fucsia: {
          50: '#fff0f7',
          100: '#ffe0ef',
          200: '#ffb8db',
          300: '#ff85bf',
          400: '#fb4ea0',
          500: '#ec1e79',
          600: '#d10f66',
          700: '#a90c53',
          800: '#800a3f',
          900: '#5c072d',
        },
        morado: {
          50: '#f5f1ff',
          100: '#ede4ff',
          200: '#d9c7ff',
          300: '#bb9bff',
          400: '#9a68ff',
          500: '#7c3aed',
          600: '#6b21d8',
          700: '#5717ad',
          800: '#40128a',
          900: '#2c0d60',
        },
        celeste: {
          50: '#eafcff',
          100: '#cff8ff',
          200: '#a2f0ff',
          300: '#63e4ff',
          400: '#22d3ee',
          500: '#0ab8d6',
          600: '#0993ab',
          700: '#0b7488',
          800: '#0f5c6d',
          900: '#0f4c5c',
        },
        amarillo: {
          50: '#fffbeb',
          100: '#fff3c4',
          200: '#ffe587',
          300: '#ffd046',
          400: '#fbbf24',
          500: '#f5a30a',
          600: '#d97e06',
          700: '#b45a09',
          800: '#92460e',
          900: '#78390f',
        },
        ink: '#1a1523',
      },
      fontFamily: {
        display: ['Fredoka', 'sans-serif'],
        body: ['Poppins', 'sans-serif'],
        alt: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      boxShadow: {
        soft: '0 10px 40px -10px rgba(124, 58, 237, 0.18)',
        card: '0 8px 30px -8px rgba(26, 21, 35, 0.12)',
        glow: '0 0 0 1px rgba(255,255,255,0.4), 0 20px 50px -12px rgba(236, 30, 121, 0.35)',
      },
      backgroundImage: {
        'party-gradient': 'linear-gradient(135deg, #ec1e79 0%, #7c3aed 55%, #22d3ee 100%)',
        'party-gradient-soft': 'linear-gradient(135deg, #fff0f7 0%, #f5f1ff 55%, #eafcff 100%)',
        'sun-gradient': 'linear-gradient(135deg, #fbbf24 0%, #ec1e79 100%)',
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-slow': 'float 9s ease-in-out infinite',
        'blob': 'blob 12s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        blob: {
          '0%, 100%': { borderRadius: '42% 58% 65% 35% / 45% 40% 60% 55%', transform: 'rotate(0deg)' },
          '50%': { borderRadius: '58% 42% 35% 65% / 55% 65% 35% 45%', transform: 'rotate(8deg)' },
        },
      },
    },
  },
  plugins: [],
}
