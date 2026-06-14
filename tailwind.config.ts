import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        lakeview: {
          page: "#FAF7F2",
          card: "#FFFFFF",
          navy: "#0D1B2A",
          gold: "#B8860B",
          teal: "#1A6B60",
          amber: "#D97706",
          border: "#E5E0D8",
          text: {
            primary: "#1A1208",
            secondary: "#7A7060",
          },
        },
      },
      fontFamily: {
        lakeview: ["Georgia", "Palatino", "serif"],
      },
    },
  },
  plugins: [],
};

export default config;