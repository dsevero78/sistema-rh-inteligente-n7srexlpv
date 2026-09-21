/* Tailwind config for the frontend react app. This is where the app theme should be defined: https://v2.tailwindcss.com/docs/configuration. */
import type { Config } from 'tailwindcss'
import animatePlugin from 'tailwindcss-animate'
import typographyPlugin from '@tailwindcss/typography'
import aspectRatioPlugin from '@tailwindcss/aspect-ratio'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica',
          'Arial',
          'sans-serif',
        ],
        display: [
          'Montserrat',
          'Gotham',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        mono: ['JetBrains Mono', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      colors: {
        souyess: {
          orange: {
            50: '#FEF1EA',
            100: '#FBDCC9',
            200: '#F6BC97',
            300: '#F19763',
            400: '#ED7338',
            500: '#E9530E',
            600: '#C5430A',
            700: '#9B340A',
            800: '#6F2608',
          },
          navy: {
            50: '#ECEEF4',
            100: '#D3D7E5',
            200: '#A8B0C9',
            300: '#7480A6',
            400: '#4A567E',
            600: '#2E3A6E',
            700: '#212B55',
            800: '#1A2240',
            900: '#11162B',
          },
          blue: {
            50: '#EDF2F9',
            100: '#D7E0F0',
            400: '#4F76BC',
            500: '#345EA9',
            600: '#2A4D8C',
          },
          gray: {
            50: '#F2F4F8',
            100: '#E7EAF0',
            200: '#D7DCE6',
            300: '#BFC5D2',
            400: '#98A0B0',
            500: '#6B7384',
            600: '#4D5566',
            700: '#353C4D',
            800: '#1F2435',
          },
          status: {
            success: '#1F9D6A',
            successBg: '#DDF3E8',
            warning: '#E5A700',
            warningBg: '#FBF1D2',
            danger: '#D5392C',
            dangerBg: '#F8DDD9',
            info: '#3B6FE0',
            infoBg: '#DCE6FA',
          },
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        pill: '999px',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
      },
      boxShadow: {
        subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        elevation: '0 4px 20px rgba(0, 0, 0, 0.05)',
        'souyess-xs': '0 1px 1px rgba(11, 18, 48, 0.04)',
        'souyess-sm': '0 1px 2px rgba(11, 18, 48, 0.06), 0 1px 3px rgba(11, 18, 48, 0.08)',
        'souyess-md': '0 6px 16px rgba(11, 18, 48, 0.10), 0 2px 4px rgba(11, 18, 48, 0.06)',
        'souyess-lg': '0 16px 32px rgba(11, 18, 48, 0.12), 0 4px 8px rgba(11, 18, 48, 0.06)',
        'souyess-focus': '0 0 0 2px #FFFFFF, 0 0 0 4px #E9530E',
      },
      transitionTimingFunction: {
        apple: 'cubic-bezier(0.42, 0, 0.58, 1)',
        souyess: 'cubic-bezier(0.32, 0.72, 0, 1)',
      },
    },
  },
  plugins: [animatePlugin, typographyPlugin, aspectRatioPlugin],
} satisfies Config
