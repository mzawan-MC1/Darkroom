/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        charcoal: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1f2937',
          900: '#0b0f17',
          950: '#05060a',
        },
      },
      boxShadow: {
        'red-glow': '0 0 0 1px rgba(244, 63, 94, 0.35), 0 0 30px rgba(244, 63, 94, 0.18)',
        'red-glow-strong': '0 0 0 1px rgba(244, 63, 94, 0.55), 0 0 55px rgba(244, 63, 94, 0.25)',
        panel: '0 10px 35px rgba(0, 0, 0, 0.55)',
      },
      backgroundImage: {
        'horror-radial': 'radial-gradient(1200px 600px at 20% 0%, rgba(244, 63, 94, 0.18), transparent 60%), radial-gradient(800px 400px at 80% 20%, rgba(244, 63, 94, 0.10), transparent 55%)',
        'horror-grain': 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.06) 1px, transparent 0)',
      },
      fontFamily: {
        display: ['Cinzel', 'ui-serif', 'Georgia', 'serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'Segoe UI', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
        script: ['Dancing Script', 'cursive'],
      },
      letterSpacing: {
        wide: '.08em',
        wider: '.12em',
      },
    },
  },
  plugins: [],
};
