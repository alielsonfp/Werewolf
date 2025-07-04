/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // 🎨 TOWN OF SALEM COLOR PALETTE
      colors: {
        // Primary Town of Salem colors
        salem: {
          50: '#faf7f4',
          100: '#f4ede3',
          200: '#e8d9c3',
          300: '#d7c09b',
          400: '#c5a473',
          500: '#b8925a',
          600: '#a67c4a',
          700: '#8a6540',
          800: '#725338',
          900: '#5d4630',
          950: '#312418',
        },

        // Dark medieval theme
        medieval: {
          50: '#f9f7f4',
          100: '#f0ebe2',
          200: '#e0d5c3',
          300: '#ccb99e',
          400: '#b59a77',
          500: '#a6875f',
          600: '#997353',
          700: '#7f5d46',
          800: '#694d3d',
          900: '#554035',
          950: '#2d211b',
        },

        // Game specific colors
        werewolf: {
          DEFAULT: '#8B0000',
          light: '#CD5C5C',
          dark: '#660000',
        },
        town: {
          DEFAULT: '#228B22',
          light: '#90EE90',
          dark: '#006400',
        },
        neutral: {
          DEFAULT: '#DAA520',
          light: '#FFD700',
          dark: '#B8860B',
        },

        // Phase colors
        night: {
          DEFAULT: '#1a1a2e',
          light: '#16213e',
          dark: '#0f0f1a',
        },
        day: {
          DEFAULT: '#f4e4bc',
          light: '#f9f1d9',
          dark: '#ead19f',
        },
        voting: {
          DEFAULT: '#8B0000',
          light: '#CD5C5C',
          dark: '#660000',
        },
      },

      // Typography
      fontFamily: {
        medieval: ['Cinzel', 'serif'],
        game: ['Pirata One', 'cursive'],
        ui: ['Inter', 'sans-serif'],
      },

      // Spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },

      // Animation
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'death': 'death 1s ease-in-out',
      },

      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(218, 165, 32, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(218, 165, 32, 0.8)' },
        },
        death: {
          '0%': { opacity: '1', transform: 'scale(1) rotate(0deg)' },
          '50%': { opacity: '0.5', transform: 'scale(1.1) rotate(5deg)' },
          '100%': { opacity: '0.3', transform: 'scale(0.9) rotate(-5deg)' },
        },
      },

      // Box shadows
      boxShadow: {
        'medieval': '0 4px 20px rgba(0, 0, 0, 0.5)',
        'inset-medieval': 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
        'glow-gold': '0 0 20px rgba(218, 165, 32, 0.6)',
        'glow-red': '0 0 20px rgba(139, 0, 0, 0.6)',
        'glow-green': '0 0 20px rgba(34, 139, 34, 0.6)',
      },

      // Background images
      backgroundImage: {
        'medieval-paper': "url('/images/paper-texture.jpg')",
        'wood-dark': "url('/images/wood-dark.jpg')",
        'stone': "url('/images/stone-texture.jpg')",
        'night-sky': "url('/images/night-sky.jpg')",
      },

      // Borders
      borderWidth: {
        '3': '3px',
        '5': '5px',
      },
    },
  },
  plugins: [
    // Removidos plugins problemáticos temporariamente
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
};