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
          primary: '#533afd',
          'primary-deep': '#4434d4',
          'primary-press': '#2e2b8c',
          'primary-soft': '#665efd',
          'primary-subdued': '#b9b9f9',
          'brand-dark': '#1c1e54',
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
        'glow-indigo': '0 0 24px rgba(83, 58, 253, 0.25)',
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
