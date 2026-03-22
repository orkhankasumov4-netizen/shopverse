/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        amazon: {
          orange:     '#FF9900',
          'orange-dark': '#E47911',
          navy:       '#232F3E',
          'navy-light': '#37475A',
          teal:       '#00A8A8',
          yellow:     '#FEBD69',
          'yellow-light': '#FFF3CD',
          green:      '#007600',
          red:        '#B12704',
          'bg-light': '#EAEDED',
          'bg-dark':  '#131921',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        display: ['var(--font-outfit)', 'sans-serif'],
      },
      animation: {
        'fade-in':       'fadeIn 0.3s ease-in-out',
        'slide-up':      'slideUp 0.4s ease-out',
        'slide-down':    'slideDown 0.3s ease-out',
        'scale-in':      'scaleIn 0.2s ease-out',
        'shimmer':       'shimmer 1.5s infinite',
        'bounce-subtle': 'bounceSlight 0.5s ease-out',
      },
      keyframes: {
        fadeIn:      { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:     { from: { opacity: 0, transform: 'translateY(20px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        slideDown:   { from: { opacity: 0, transform: 'translateY(-10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn:     { from: { opacity: 0, transform: 'scale(0.95)' }, to: { opacity: 1, transform: 'scale(1)' } },
        shimmer:     { '0%': { backgroundPosition: '-1000px 0' }, '100%': { backgroundPosition: '1000px 0' } },
        bounceSlight:{ '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-4px)' } },
      },
      boxShadow: {
        'product': '0 2px 5px rgba(15,17,17,0.15)',
        'product-hover': '0 4px 16px rgba(15,17,17,0.2)',
        'nav': '0 2px 4px rgba(15,17,17,0.2)',
      },
    },
  },
  plugins: [],
};
