/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    fontFamily: {
      sans: [
        'Inter',
        'ui-sans-serif',
        'system-ui',
        '-apple-system',
        'BlinkMacSystemFont',
        '"Segoe UI"',
        'Roboto',
        '"Helvetica Neue"',
        'Arial',
        'sans-serif',
      ],
      serif: ['ui-serif', 'Georgia', 'Cambria', 'serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
    },
    screens: {
      xs: '576px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
      '2xl': '1536px',
      fhd: '1920px',
    },
    extend: {
      colors: {
        // Token permukaan & tinta dari CSS variables
        app: 'var(--app)',
        surface: {
          DEFAULT: 'var(--surface)',
          2: 'var(--surface-2)',
          3: 'var(--surface-3)',
        },
        line: {
          DEFAULT: 'var(--line)',
          strong: 'var(--line-strong)',
        },
        ink: {
          DEFAULT: 'var(--ink)',
          2: 'var(--ink-2)',
          3: 'var(--ink-3)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          deep: 'var(--primary-deep)',
          mild: 'var(--primary-mild)',
          subtle: 'var(--primary-subtle)',
          line: 'var(--primary-line)',
          on: 'var(--on-primary)',
        },
        error: { DEFAULT: 'var(--error)', on: 'var(--on-error)', subtle: 'var(--error-subtle)', line: 'var(--error-line)' },
        success: { DEFAULT: 'var(--success)', subtle: 'var(--success-subtle)', line: 'var(--success-line)' },
        warning: { DEFAULT: 'var(--warning)', subtle: 'var(--warning-subtle)', line: 'var(--warning-line)' },
        info: { DEFAULT: 'var(--info)', subtle: 'var(--info-subtle)' },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring-hsl))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        panel: 'var(--radius)',
        control: 'var(--radius-control)',
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 4px)',
        sm: 'calc(var(--radius) - 8px)',
      },
      boxShadow: {
        1: 'var(--shadow-sm)',
        2: 'var(--shadow-md)',
        3: 'var(--shadow-lg)',
      },
      letterSpacing: {
        tightest: '-0.02em',
      },
      transitionTimingFunction: {
        out: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
