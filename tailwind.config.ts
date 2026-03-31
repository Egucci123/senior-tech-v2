import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#131313",
        "on-background": "#e5e2e1",
        surface: "#131313",
        "surface-dim": "#131313",
        "surface-bright": "#3a3939",
        "surface-variant": "#353534",
        "surface-tint": "#75d1ff",
        "surface-container-lowest": "#0e0e0e",
        "surface-container-low": "#1c1b1b",
        "surface-container": "#201f1f",
        "surface-container-high": "#2a2a2a",
        "surface-container-highest": "#353534",
        "on-surface": "#e5e2e1",
        "on-surface-variant": "#bdc8d0",
        primary: "#9adbff",
        "primary-container": "#4fc3f7",
        "primary-fixed": "#c2e8ff",
        "primary-fixed-dim": "#75d1ff",
        "on-primary": "#003548",
        "on-primary-container": "#004e69",
        "inverse-primary": "#006688",
        secondary: "#ffd799",
        "secondary-container": "#feb300",
        "on-secondary-container": "#6a4800",
        tertiary: "#84e982",
        "tertiary-container": "#69cc69",
        "on-tertiary": "#00390a",
        error: "#ffb4ab",
        "error-container": "#93000a",
        outline: "#889299",
        "outline-variant": "#3e484f",
      },
      fontFamily: {
        headline: ['"Barlow Condensed"', "sans-serif"],
        body: ['"Inter"', "sans-serif"],
        label: ['"Barlow Condensed"', "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
};

export default config;
