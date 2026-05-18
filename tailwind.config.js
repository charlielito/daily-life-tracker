/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // New design tokens
        paper: "hsl(var(--paper))",
        "paper-2": "hsl(var(--paper-2))",
        surface: "hsl(var(--surface))",
        ink: "hsl(var(--ink))",
        "ink-2": "hsl(var(--ink-2))",
        muted: "hsl(var(--muted))",
        "muted-2": "hsl(var(--muted-2))",
        hairline: "hsl(var(--hairline))",
        "hairline-strong": "hsl(var(--hairline-strong))",
        iron: "hsl(var(--iron))",
        "iron-soft": "hsl(var(--iron-soft))",
        botanical: "hsl(var(--green))",
        mustard: "hsl(var(--mustard))",

        // shadcn legacy tokens — kept so untouched primitives still compile
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        "muted-fg": "hsl(var(--muted-foreground))",
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "Iowan Old Style", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Editorial scale tokens (matches DESIGN.md)
        hero: ["56px", { lineHeight: "60px", letterSpacing: "-0.02em" }],
        h1: ["40px", { lineHeight: "44px", letterSpacing: "-0.015em" }],
        h2: ["24px", { lineHeight: "32px" }],
        h3: ["18px", { lineHeight: "28px" }],
        "data-xl": ["52px", { lineHeight: "56px", letterSpacing: "-0.015em" }],
        "data-md": ["18px", { lineHeight: "24px" }],
      },
      borderRadius: {
        none: "0",
        sm: "2px",
        DEFAULT: "4px",
        md: "4px",   // legacy alias → 4px now
        lg: "0",     // legacy alias → flat now (was 8px); cards become flat
        modal: "8px",
        full: "9999px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: 0 },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: 0 },
        },
        "fade-in": { from: { opacity: 0 }, to: { opacity: 1 } },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.18s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
