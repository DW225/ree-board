/* eslint-disable @typescript-eslint/no-require-imports */
import type { Config } from "tailwindcss";
import fluid, { extract } from "fluid-tailwind";
import typography from "@tailwindcss/typography";
import daisyui from "daisyui"
import tailwindcssAnimate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: {
    files: [
      "./pages/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    extract,
  },
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
        animation: {
          "fade-in-down": "fadeInDown 0.3s ease-out",
          "fade-out-up": "fadeOutUp 0.3s ease-out",
        },
        keyframes: {
          fadeInDown: {
            "0%": { opacity: "0", transform: "translateY(-10px)" },
            "100%": { opacity: "1", transform: "translateY(0)" },
          },
          fadeOutUp: {
            "0%": { opacity: "1", transform: "translateY(0)" },
            "100%": { opacity: "0", transform: "translateY(-10px)" },
          },
        },
      },
    },
  },
  plugins: [typography, daisyui, tailwindcssAnimate, fluid],
  daisyui: {
    themes: ["light"],
  },
};
export default config;
