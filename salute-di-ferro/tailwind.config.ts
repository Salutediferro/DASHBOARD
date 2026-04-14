import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#111111",
        foreground: "#ededed",
        primary: {
          DEFAULT: "#0a0a0a",
          foreground: "#ededed",
        },
        accent: {
          DEFAULT: "#c9a96e",
          foreground: "#0a0a0a",
        },
        muted: {
          DEFAULT: "#1a1a1a",
          foreground: "#a1a1a1",
        },
        border: "#262626",
        card: {
          DEFAULT: "#161616",
          foreground: "#ededed",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
