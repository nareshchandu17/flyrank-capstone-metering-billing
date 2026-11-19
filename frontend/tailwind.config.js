/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Inter', 'SF Pro Display', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        stripi: {
          primary: '#D4FF28',
          'primary-deep': '#BEF218',
          'primary-press': '#A8DC10',
          'primary-soft': '#E6FFA0',
          'primary-subdued': 'rgba(212, 255, 40, 0.2)',
          'primary-text': '#0d253d',
          'primary-dark': '#3F6212',
          'brand-dark': '#111812',
          ink: '#0d253d',
          'ink-secondary': '#273951',
          'ink-mute': '#64748d',
          'ink-mute-2': '#61718a',
          canvas: '#ffffff',
          'canvas-soft': '#f6f9fc',
          'canvas-cream': '#f5e9d4',
          hairline: '#e3e8ee',
          'hairline-input': '#a8c3de',
          ruby: '#ea2261',
          magenta: '#f96bee',
          lemon: '#9b6829',
        }
      },
      borderRadius: {
        'xs': '4px',
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'pill': '9999px',
      },
      boxShadow: {
        'level-1': '0 1px 3px rgba(0, 55, 112, 0.08)',
        'level-2': '0 8px 24px rgba(0, 55, 112, 0.08), 0 2px 6px rgba(0, 55, 112, 0.04)',
        'level-3': '0 20px 40px rgba(0, 55, 112, 0.12)',
        'glow-indigo': '0 0 24px rgba(212, 255, 40, 0.45)',
        'glow-lime': '0 0 24px rgba(212, 255, 40, 0.45)',
      },
      letterSpacing: {
        'display-xxl': '-1.4px',
        'display-xl': '-0.96px',
        'display-lg': '-0.64px',
        'display-md': '-0.26px',
        'heading-lg': '-0.22px',
        'heading-md': '-0.2px',
        'tabular': '-0.42px',
        'caption': '-0.39px',
      }
    },
  },
  plugins: [],
}
