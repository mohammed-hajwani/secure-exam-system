/** @type {import('tailwindcss').Config} */
export default {
  // Phones keep :hover after a tap; only apply hover styles where hover exists
  future: { hoverOnlyWhenSupported: true },
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Atkinson Hyperlegible Next Variable"', 'system-ui', 'sans-serif'],
        display: ['"Archivo Variable"', '"Atkinson Hyperlegible Next Variable"', 'sans-serif']
      },
      colors: {
        // Felt noticeboard: the shell
        board: {
          DEFAULT: '#2F6B4F',
          deep: '#245640',
          light: '#3B7D5E',
          ink: '#D7EADF'
        },
        // Printing ink on the sheets
        ink: {
          DEFAULT: '#14213D',
          soft: '#3D4A63',
          faint: '#5E6880'
        },
        // Paper and the page ground the sheets sit on
        paper: {
          DEFAULT: '#FFFFFF',
          ground: '#ECEFEA',
          tint: '#F6F7F4',
          rule: '#D3D9D1',
          line: '#E5E9E3'
        },
        // Coloured paper stock = status, always paired with a printed word
        stock: {
          canary: '#FFE27A',
          'canary-ink': '#6B4E00',
          mint: '#BFE9CF',
          'mint-ink': '#11523A',
          sky: '#C6DFF5',
          'sky-ink': '#1C4A75',
          salmon: '#FFC4B0',
          'salmon-ink': '#8A2B12'
        },
        // Highlighter: reserved for you / now
        hl: {
          DEFAULT: '#E3F24C',
          deep: '#C9DA22'
        },
        alarm: '#B42318'
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }]
      },
      borderRadius: {
        sheet: '4px'
      },
      boxShadow: {
        sheet: '0 1px 1px rgba(20,33,61,0.06), 0 6px 16px -6px rgba(20,33,61,0.14)',
        pinned: '0 2px 3px rgba(20,33,61,0.10), 0 18px 32px -14px rgba(20,33,61,0.38)',
        lift: '0 1px 2px rgba(20,33,61,0.08), 0 10px 24px -10px rgba(20,33,61,0.28)'
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)'
      }
    }
  },
  plugins: []
};
