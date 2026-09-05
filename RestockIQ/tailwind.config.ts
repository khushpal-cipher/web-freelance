import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#141413",
        paper: "#faf9f5",
        accent: "#d97757",
        status: {
          healthy: "#2f9e44",
          reorder: "#e03131",
          overstocked: "#3b6fd9",
        },
      },
      fontFamily: {
        heading: ["var(--font-heading)", "sans-serif"],
        body: ["var(--font-body)", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;
