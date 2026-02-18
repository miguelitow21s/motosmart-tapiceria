import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./features/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Sora", "system-ui", "sans-serif"],
        display: ["Orbitron", "system-ui", "sans-serif"]
      },
      fontSize: {
        sm: ["var(--font-size-sm)", { lineHeight: "1.5" }],
        base: ["var(--font-size-base)", { lineHeight: "1.6" }],
        lg: ["var(--font-size-lg)", { lineHeight: "1.5" }],
        xl: ["var(--font-size-xl)", { lineHeight: "1.35" }],
        display: ["var(--font-size-display)", { lineHeight: "1.1" }]
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        border: "hsl(var(--border))",
        muted: "hsl(var(--muted))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        }
      },
      borderRadius: {
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)"
      },
      boxShadow: {
        card: "var(--shadow-card)",
        glow: "var(--shadow-glow)"
      },
      backgroundImage: {
        honeycomb:
          "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.04) 2px, transparent 2px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.03) 2px, transparent 2px), linear-gradient(135deg, rgba(255,30,30,0.12), rgba(5,5,5,0.95))"
      },
      animation: {
        glow: "glow 2.8s ease-in-out infinite alternate",
        float: "float 6s ease-in-out infinite"
      },
      keyframes: {
        glow: {
          from: { boxShadow: "0 0 16px rgba(255,30,30,0.2)" },
          to: { boxShadow: "0 0 32px rgba(255,30,30,0.75)" }
        },
        float: {
          "0%,100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        }
      }
    }
  },
  plugins: [require("tailwindcss-animate")]
};

export default config;
