import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // PakGold premium palette — gold on deep navy/black, white surfaces, subtle green for success.
        gold: {
          DEFAULT: "#D4AF37",
          50: "#FBF6E4",
          100: "#F5EAC0",
          200: "#EBD587",
          300: "#E0C04E",
          400: "#D4AF37",
          500: "#B8942A",
          600: "#937420",
          700: "#6E5618",
          800: "#4A3A10",
          900: "#261D08",
        },
        navy: {
          DEFAULT: "#0B1120",
          50: "#E7EAF0",
          800: "#111A30",
          900: "#0B1120",
          950: "#060A14",
        },
        success: "#1F9D55",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        urdu: ["var(--font-urdu)", "Noto Nastaliq Urdu", "serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
