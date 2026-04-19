/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        canvas: '#faf9f7',
        surface: '#ffffff',
        brand: {
          DEFAULT: '#2d5a54',
          deep: '#13423d',
        },
        gold: {
          DEFAULT: '#cca830',
          accent: '#d4af37',
          muted: '#735c00',
        },
        ink: '#1a1c1b',
        muted: '#404847',
        border: {
          soft: 'rgba(192, 200, 198, 0.35)',
        },
        stitch: {
          bg: '#faf9f7',
          'surface-low': '#f4f3f1',
          'surface-high': '#e9e8e6',
          outline: '#c0c8c6',
          white: '#ffffff',
          'on-surface': '#1a1c1b',
          'on-variant': '#404847',
          primary: '#13423d',
          'primary-mid': '#2d5a54',
          gold: '#cca830',
        },
        'dua-tint': 'rgba(19, 66, 61, 0.04)',
      },
      fontFamily: {
        sans: ['Manrope', 'Inter', 'system-ui', 'sans-serif'],
        arabic: ['Noto Naskh Arabic', 'Amiri', 'Traditional Arabic', 'serif'],
      },
      fontSize: {
        body: ['1.0625rem', { lineHeight: '1.55' }],
        'dua-ar': ['1.25em', { lineHeight: '1.75' }],
      },
      borderRadius: {
        card: '8px',
        hero: '32px',
        stitch: '24px',
        pill: '9999px',
      },
      spacing: {
        touch: '44px',
      },
      boxShadow: {
        ambient: '0 8px 32px rgba(19, 66, 61, 0.06)',
        float: '0 4px 24px rgba(19, 66, 61, 0.07)',
        card: '0 4px 24px rgba(19, 66, 61, 0.07)',
      },
      backgroundImage: {
        'brand-pill': 'linear-gradient(135deg, #13423d 0%, #2d5a54 100%)',
      },
    },
  },
  plugins: [],
};
